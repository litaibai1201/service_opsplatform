import { useState, useCallback, useEffect } from 'react';
import { authApi } from '@/services/api/authApi';
import { validateEmail, validateUsername, validatePassword } from '@/utils/validation';

export interface ValidationState {
  isChecking: boolean;
  isValid: boolean | null;
  message?: string;
  suggestions?: string[];
}

export interface UseAuthValidationReturn {
  // 用户名验证
  usernameValidation: ValidationState;
  checkUsernameAvailability: (username: string) => Promise<void>;
  validateUsernameFormat: (username: string) => boolean;
  
  // 邮箱验证
  emailValidation: ValidationState;
  checkEmailAvailability: (email: string) => Promise<void>;
  validateEmailFormat: (email: string) => boolean;
  
  // 密码验证
  passwordValidation: ValidationState;
  validatePasswordStrength: (password: string) => ValidationState;
  
  // 邀请码验证
  inviteCodeValidation: ValidationState;
  validateInviteCode: (code: string) => Promise<void>;
  
  // 重置所有验证状态
  resetValidation: () => void;
}

export const useAuthValidation = (): UseAuthValidationReturn => {
  const [usernameValidation, setUsernameValidation] = useState<ValidationState>({
    isChecking: false,
    isValid: null,
  });
  
  const [emailValidation, setEmailValidation] = useState<ValidationState>({
    isChecking: false,
    isValid: null,
  });
  
  const [passwordValidation, setPasswordValidation] = useState<ValidationState>({
    isChecking: false,
    isValid: null,
  });
  
  const [inviteCodeValidation, setInviteCodeValidation] = useState<ValidationState>({
    isChecking: false,
    isValid: null,
  });

  // 检查用户名可用性
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || !validateUsername(username)) {
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: '用户名格式不正确',
      });
      return;
    }

    setUsernameValidation(prev => ({ ...prev, isChecking: true }));
    
    try {
      const result = await authApi.checkUsernameAvailability(username);
      
      setUsernameValidation({
        isChecking: false,
        isValid: result.available,
        message: result.available ? '用户名可用' : '用户名已被使用',
        suggestions: result.suggestions,
      });
    } catch (error) {
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: '检查用户名时出错',
      });
    }
  }, []);

  // 验证用户名格式
  const validateUsernameFormat = useCallback((username: string): boolean => {
    const isValid = validateUsername(username);
    
    if (!isValid) {
      setUsernameValidation({
        isChecking: false,
        isValid: false,
        message: '用户名长度3-20位，只能包含字母、数字和下划线',
      });
    }
    
    return isValid;
  }, []);

  // 检查邮箱可用性
  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!email || !validateEmail(email)) {
      setEmailValidation({
        isChecking: false,
        isValid: false,
        message: '邮箱格式不正确',
      });
      return;
    }

    setEmailValidation(prev => ({ ...prev, isChecking: true }));
    
    try {
      const result = await authApi.checkEmailAvailability(email);
      
      setEmailValidation({
        isChecking: false,
        isValid: result.available,
        message: result.available ? '邮箱可用' : '邮箱已被注册',
      });
    } catch (error) {
      setEmailValidation({
        isChecking: false,
        isValid: false,
        message: '检查邮箱时出错',
      });
    }
  }, []);

  // 验证邮箱格式
  const validateEmailFormat = useCallback((email: string): boolean => {
    const isValid = validateEmail(email);
    
    if (!isValid) {
      setEmailValidation({
        isChecking: false,
        isValid: false,
        message: '请输入有效的邮箱地址',
      });
    }
    
    return isValid;
  }, []);

  // 验证密码强度
  const validatePasswordStrength = useCallback((password: string): ValidationState => {
    if (!password) {
      const state = {
        isChecking: false,
        isValid: false,
        message: '请输入密码',
      };
      setPasswordValidation(state);
      return state;
    }

    const isValidFormat = validatePassword(password);
    let strength = 0;
    let message = '';
    let isValid = false;

    // 检查密码强度
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/\d/.test(password)) strength += 1;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 1;

    if (!isValidFormat) {
      message = '密码长度至少8位，且包含字母和数字';
    } else if (strength <= 2) {
      message = '密码强度：弱';
      isValid = true;
    } else if (strength <= 3) {
      message = '密码强度：中等';
      isValid = true;
    } else if (strength <= 4) {
      message = '密码强度：强';
      isValid = true;
    } else {
      message = '密码强度：非常强';
      isValid = true;
    }

    const state = {
      isChecking: false,
      isValid: isValid && isValidFormat,
      message,
    };
    
    setPasswordValidation(state);
    return state;
  }, []);

  // 验证邀请码
  const validateInviteCode = useCallback(async (code: string) => {
    if (!code) {
      setInviteCodeValidation({
        isChecking: false,
        isValid: null,
      });
      return;
    }

    setInviteCodeValidation(prev => ({ ...prev, isChecking: true }));
    
    try {
      const result = await authApi.validateInviteCode(code);
      
      setInviteCodeValidation({
        isChecking: false,
        isValid: result.valid,
        message: result.valid 
          ? `邀请码有效${result.teamName ? ` - ${result.teamName}` : ''}` 
          : '邀请码无效或已过期',
      });
    } catch (error) {
      setInviteCodeValidation({
        isChecking: false,
        isValid: false,
        message: '验证邀请码时出错',
      });
    }
  }, []);

  // 重置所有验证状态
  const resetValidation = useCallback(() => {
    setUsernameValidation({ isChecking: false, isValid: null });
    setEmailValidation({ isChecking: false, isValid: null });
    setPasswordValidation({ isChecking: false, isValid: null });
    setInviteCodeValidation({ isChecking: false, isValid: null });
  }, []);

  return {
    usernameValidation,
    checkUsernameAvailability,
    validateUsernameFormat,
    
    emailValidation,
    checkEmailAvailability,
    validateEmailFormat,
    
    passwordValidation,
    validatePasswordStrength,
    
    inviteCodeValidation,
    validateInviteCode,
    
    resetValidation,
  };
};

// 专门的用户名验证Hook
export const useUsernameValidation = () => {
  const { 
    usernameValidation, 
    checkUsernameAvailability, 
    validateUsernameFormat 
  } = useAuthValidation();
  
  return { 
    validation: usernameValidation, 
    checkAvailability: checkUsernameAvailability, 
    validateFormat: validateUsernameFormat 
  };
};

// 专门的邮箱验证Hook
export const useEmailValidation = () => {
  const { 
    emailValidation, 
    checkEmailAvailability, 
    validateEmailFormat 
  } = useAuthValidation();
  
  return { 
    validation: emailValidation, 
    checkAvailability: checkEmailAvailability, 
    validateFormat: validateEmailFormat 
  };
};

// 专门的密码验证Hook
export const usePasswordValidation = () => {
  const { passwordValidation, validatePasswordStrength } = useAuthValidation();
  
  return { 
    validation: passwordValidation, 
    validateStrength: validatePasswordStrength 
  };
};

export default useAuthValidation;