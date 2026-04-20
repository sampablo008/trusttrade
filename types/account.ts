export interface AccountSecurityStatus {
  hasWithdrawalPin: boolean;
  emailVerified: boolean;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface SetWithdrawalPinInput {
  currentPin?: string;
  newPin: string;
  confirmPin: string;
}

export interface VerifyWithdrawalPinInput {
  pin: string;
}
