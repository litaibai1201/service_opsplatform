// 主要认证Hook
export { useAuth } from './useAuth';
export type { AuthState, AuthActions, UseAuthReturn } from './useAuth';

// 登录相关Hook
export { useLogin, useQuickLogin, useSilentLogin } from './useLogin';
export type { UseLoginOptions, UseLoginReturn } from './useLogin';

// 注册相关Hook
export { useRegister, useQuickRegister, useSilentRegister } from './useRegister';
export type { UseRegisterOptions, UseRegisterReturn } from './useRegister';

// 密码重置相关Hook
export { 
  usePasswordReset, 
  useForgotPassword, 
  useResetPassword, 
  useEmailVerification 
} from './usePasswordReset';
export type { UsePasswordResetReturn } from './usePasswordReset';

// 验证相关Hook
export { 
  useAuthValidation,
  useUsernameValidation,
  useEmailValidation,
  usePasswordValidation
} from './useAuthValidation';
export type { ValidationState, UseAuthValidationReturn } from './useAuthValidation';

// 便捷组合Hook
export const useAuthModule = () => {
  return {
    useAuth,
    useLogin: useQuickLogin,
    useRegister: useQuickRegister,
    usePasswordReset,
    useAuthValidation,
  };
};

// 默认导出主要Hook
export default useAuth;