import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { API_CONFIG, storage } from './apiConfig';
import { showToast } from '@/components/ui/ToastContainer';

// 请求接口
export interface ApiRequest extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipErrorHandling?: boolean;
  retryCount?: number;
}

// 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  code: number;
  timestamp: number;
}

// 错误响应接口
export interface ApiError {
  success: false;
  message: string;
  code: number;
  details?: any;
  timestamp: number;
}

class HttpClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedRequestsQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证头
        if (!config.skipAuth) {
          const token = storage.getToken();
          if (token) {
            config.headers[API_CONFIG.AUTH.TOKEN_HEADER] = 
              `${API_CONFIG.AUTH.TOKEN_PREFIX}${token}`;
          }
        }

        // 添加请求ID用于追踪
        config.headers['X-Request-ID'] = this.generateRequestId();

        // 日志记录
        if (process.env.NODE_ENV === 'development') {
          console.log('🚀 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            data: config.data,
            headers: config.headers,
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        // 日志记录
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ API Response:', {
            status: response.status,
            url: response.config.url,
            data: response.data,
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as ApiRequest;

        // 日志记录
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ API Error:', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message,
            data: error.response?.data,
          });
        }

        // 处理 401 未授权错误（token 过期）
        if (error.response?.status === 401 && !originalRequest.skipAuth) {
          return this.handleUnauthorized(originalRequest, error);
        }

        // 处理网络错误重试
        if (this.shouldRetry(error, originalRequest)) {
          return this.retryRequest(originalRequest);
        }

        // 统一错误处理
        if (!originalRequest.skipErrorHandling) {
          this.handleError(error);
        }

        return Promise.reject(this.formatError(error));
      }
    );
  }

  // 处理未授权错误
  private async handleUnauthorized(originalRequest: ApiRequest, error: AxiosError) {
    const refreshToken = storage.getRefreshToken();
    
    if (!refreshToken) {
      // 没有 refresh token，直接跳转到登录
      this.redirectToLogin();
      return Promise.reject(this.formatError(error));
    }

    if (this.isRefreshing) {
      // 正在刷新 token，将请求加入队列
      return new Promise((resolve, reject) => {
        this.failedRequestsQueue.push({
          resolve: (token: string) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers[API_CONFIG.AUTH.TOKEN_HEADER] = 
              `${API_CONFIG.AUTH.TOKEN_PREFIX}${token}`;
            resolve(this.client(originalRequest));
          },
          reject: (error: any) => {
            reject(error);
          },
        });
      });
    }

    this.isRefreshing = true;

    try {
      // 刷新 token
      const response = await this.client.post(API_CONFIG.ENDPOINTS.AUTH.REFRESH, {
        refreshToken,
      }, { skipAuth: true });

      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      // 更新存储的 token
      storage.setToken(accessToken);
      if (newRefreshToken) {
        storage.setRefreshToken(newRefreshToken);
      }

      // 处理队列中的请求
      this.failedRequestsQueue.forEach(({ resolve }) => {
        resolve(accessToken);
      });
      this.failedRequestsQueue = [];

      // 重新发送原始请求
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers[API_CONFIG.AUTH.TOKEN_HEADER] = 
        `${API_CONFIG.AUTH.TOKEN_PREFIX}${accessToken}`;

      return this.client(originalRequest);
    } catch (refreshError) {
      // 刷新失败，清除认证信息并跳转到登录
      this.failedRequestsQueue.forEach(({ reject }) => {
        reject(refreshError);
      });
      this.failedRequestsQueue = [];
      
      storage.clearAuth();
      this.redirectToLogin();
      
      return Promise.reject(this.formatError(error));
    } finally {
      this.isRefreshing = false;
    }
  }

  // 判断是否应该重试
  private shouldRetry(error: AxiosError, config: ApiRequest): boolean {
    const retryCount = config.retryCount || 0;
    const maxRetries = API_CONFIG.RETRY.times;

    // 网络错误或5xx错误可以重试
    const retryableError = !error.response || 
      (error.response.status >= 500 && error.response.status <= 599);

    return retryableError && retryCount < maxRetries;
  }

  // 重试请求
  private async retryRequest(config: ApiRequest) {
    const retryCount = (config.retryCount || 0) + 1;
    const delay = API_CONFIG.RETRY.delay * retryCount;

    await new Promise(resolve => setTimeout(resolve, delay));

    return this.client({
      ...config,
      retryCount,
    });
  }

  // 错误处理
  private handleError(error: AxiosError) {
    const response = error.response;
    
    if (!response) {
      // 网络错误
      showToast.error('网络连接失败，请检查网络设置');
      return;
    }

    const data = response.data as ApiError;
    const message = data?.message || this.getDefaultErrorMessage(response.status);

    // 根据状态码显示不同的错误提示
    switch (response.status) {
      case 400:
        showToast.error(message || '请求参数错误');
        break;
      case 401:
        showToast.error('登录已过期，请重新登录');
        break;
      case 403:
        showToast.error('没有权限执行此操作');
        break;
      case 404:
        showToast.error('请求的资源不存在');
        break;
      case 409:
        showToast.error(message || '数据冲突');
        break;
      case 422:
        showToast.error(message || '数据验证失败');
        break;
      case 429:
        showToast.error('请求过于频繁，请稍后再试');
        break;
      case 500:
        showToast.error('服务器内部错误');
        break;
      case 502:
        showToast.error('网关错误');
        break;
      case 503:
        showToast.error('服务暂时不可用');
        break;
      default:
        showToast.error(message || '请求失败');
    }
  }

  // 格式化错误
  private formatError(error: AxiosError): ApiError {
    const response = error.response;
    
    if (!response) {
      return {
        success: false,
        message: '网络连接失败',
        code: 0,
        timestamp: Date.now(),
      };
    }

    const data = response.data as any;
    
    return {
      success: false,
      message: data?.message || this.getDefaultErrorMessage(response.status),
      code: response.status,
      details: data?.details,
      timestamp: Date.now(),
    };
  }

  // 获取默认错误消息
  private getDefaultErrorMessage(status: number): string {
    const messages: Record<number, string> = {
      400: '请求参数错误',
      401: '未授权访问',
      403: '禁止访问',
      404: '资源不存在',
      409: '数据冲突',
      422: '数据验证失败',
      429: '请求过于频繁',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务不可用',
    };

    return messages[status] || '请求失败';
  }

  // 跳转到登录页
  private redirectToLogin() {
    // 避免在登录页再次跳转
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // 生成请求ID
  private generateRequestId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // 公共方法
  public async get<T = any>(url: string, config?: ApiRequest): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  public async post<T = any>(url: string, data?: any, config?: ApiRequest): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async put<T = any>(url: string, data?: any, config?: ApiRequest): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async patch<T = any>(url: string, data?: any, config?: ApiRequest): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  public async delete<T = any>(url: string, config?: ApiRequest): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // 上传文件
  public async upload<T = any>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void,
    config?: ApiRequest
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...config?.headers,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // 下载文件
  public async download(url: string, filename?: string, config?: ApiRequest): Promise<void> {
    const response = await this.client.get(url, {
      ...config,
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// 创建并导出客户端实例
export const httpClient = new HttpClient();
export default httpClient;