export interface UserProfileDTO {
  id: string;
  name: string;
  cpf: string;
  siap: string;
  ciap?: string;
  userType: string;
  email: string;
  faceImage?: string | null;
  hasFaceRegistered: boolean;
  accessCountSinceLastVerification: number;
  nextVerificationTrigger: number;
  lastVerificationAt?: string | null;
  requiresVerification?: boolean;
  verificationReason?: "CADASTRO_INICIAL" | null;
  createdAt: string;
}

export interface StatementItemDTO {
  id: string;
  date: string;
  description: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  category?: string;
}

export interface UserStatementDTO {
  balance: number;
  currency: string;
  items: StatementItemDTO[];
}

export interface UserListItemDTO {
  id: string;
  name: string;
  cpf: string;
  siap: string;
  ciap?: string;
  userType: string;
  email: string;
  faceImage?: string | null;
  hasFaceRegistered?: boolean;
  accessCountSinceLastVerification?: number;
  nextVerificationTrigger?: number;
  lastVerificationAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterUserInput {
  name: string;
  cpf: string;
  siap?: string;
  ciap?: string;
  userType: string;
  email: string;
  password?: string;
  confirmPassword?: string;
}

export interface CreateUserData {
  name: string;
  cpf: string;
  siap: string;
  userType: string;
  email: string;
  passwordHash: string;
  faceImage?: string | null;
}
