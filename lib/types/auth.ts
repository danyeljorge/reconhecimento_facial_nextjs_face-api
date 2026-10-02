export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  exp: number;
}

export interface LoginCredentials {
  cpf: string;
  password: string;
}

export interface AuthenticatedUserDTO {
  id: string;
  name: string;
  cpf: string;
  email: string;
  userType: string;
  ciap?: string;
  siap?: string;
  hasFaceRegistered?: boolean;
  requiresVerification?: boolean;
  verificationReason?: "CADASTRO_INICIAL" | "AUDITORIA_ALEATORIA" | null;
}

export interface AuthSuccessResult {
  success: true;
  message: string;
  user: AuthenticatedUserDTO;
}

export interface AuthErrorResult {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
}

export type AuthResult = AuthSuccessResult | AuthErrorResult;
