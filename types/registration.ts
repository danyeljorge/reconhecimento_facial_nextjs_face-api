import { UserType } from "@/lib/validation";
import { AuthenticatedUserDTO } from "@/lib/types/auth";

export interface RegisterFormData {
  name: string;
  cpf: string;
  siap: string;
  userType: UserType;
  email: string;
  password: string;
  confirmPassword: string;
}

export type RegisterStep = "dados" | "conclusao";

export type RegisterFieldErrors = Partial<Record<keyof RegisterFormData, string>>;

export interface RegisterPayload {
  name: string;
  cpf: string;
  siap: string;
  ciap?: string;
  userType: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  faceImage?: string | null;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: AuthenticatedUserDTO;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface UseRegisterFlowReturn {
  currentStep: RegisterStep;
  formData: RegisterFormData;
  fieldErrors: RegisterFieldErrors;
  isSubmitting: boolean;
  globalError: string | null;
  handleFieldChange: (field: keyof RegisterFormData, value: string) => void;
  handleFieldBlur: (field: keyof RegisterFormData) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  goToDashboard: () => void;
  resetForm: () => void;
}
