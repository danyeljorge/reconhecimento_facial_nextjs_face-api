"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isValidCPF, formatCPF, isValidEmail, UserType } from "@/lib/validation";
import { authService } from "@/services/auth.service";
import {
  RegisterFormData,
  RegisterStep,
  RegisterFieldErrors,
  UseRegisterFlowReturn,
} from "@/types/registration";

const INITIAL_FORM_DATA: RegisterFormData = {
  name: "",
  cpf: "",
  siap: "",
  userType: "Graduação",
  email: "",
  password: "",
  confirmPassword: "",
};

export interface UseRegisterFlowOptions {
  autoRedirect?: boolean;
  redirectDelayMs?: number;
  onSuccess?: () => void;
}

export function useRegisterFlow(options: UseRegisterFlowOptions = {}): UseRegisterFlowReturn {
  const { autoRedirect = true, redirectDelayMs = 1500, onSuccess } = options;

  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<RegisterStep>("dados");
  const [formData, setFormData] = useState<RegisterFormData>(INITIAL_FORM_DATA);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [touchedFields, setTouchedFields] = useState<Partial<Record<keyof RegisterFormData, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa timer se o componente for desmontado
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const validateField = useCallback(
    (field: keyof RegisterFormData, value: string, currentData: RegisterFormData = formData): string => {
      switch (field) {
        case "name":
          if (!value.trim()) return "O nome completo é obrigatório.";
          if (value.trim().length < 2) return "O nome deve ter pelo menos 2 caracteres.";
          return "";

        case "cpf": {
          const clean = value.replace(/\D/g, "");
          if (!clean) return "O CPF é obrigatório.";
          if (!isValidCPF(clean)) return "CPF inválido. Verifique os dígitos.";
          return "";
        }

        case "siap":
          if (!value.trim()) return "O SIAP é obrigatório.";
          if (value.trim().length < 2) return "O SIAP deve ter pelo menos 2 caracteres.";
          return "";

        case "userType":
          if (!value) return "Selecione o tipo de usuário.";
          return "";

        case "email":
          if (!value.trim()) return "O e-mail é obrigatório.";
          if (!isValidEmail(value)) return "Digite um e-mail válido.";
          return "";

        case "password":
          if (!value) return "A senha é obrigatória.";
          if (value.length < 6) return "A senha deve ter no mínimo 6 caracteres.";
          return "";

        case "confirmPassword":
          if (!value) return "A confirmação de senha é obrigatória.";
          if (value !== currentData.password) return "As senhas não coincidem.";
          return "";

        default:
          return "";
      }
    },
    [formData]
  );

  const handleFieldChange = useCallback(
    (field: keyof RegisterFormData, value: string) => {
      const updatedValue = field === "cpf" ? formatCPF(value) : value;

      setFormData((prev) => {
        const nextState = { ...prev, [field]: updatedValue };

        if (touchedFields[field]) {
          const err = validateField(field, updatedValue, nextState);
          setFieldErrors((errPrev) => ({ ...errPrev, [field]: err }));
        }

        // Validação cruzada da confirmação de senha
        if (field === "password" && touchedFields.confirmPassword) {
          if (nextState.confirmPassword && nextState.confirmPassword !== updatedValue) {
            setFieldErrors((errPrev) => ({
              ...errPrev,
              confirmPassword: "As senhas não coincidem.",
            }));
          } else if (nextState.confirmPassword === updatedValue) {
            setFieldErrors((errPrev) => ({ ...errPrev, confirmPassword: "" }));
          }
        }

        return nextState;
      });
    },
    [touchedFields, validateField]
  );

  const handleFieldBlur = useCallback(
    (field: keyof RegisterFormData) => {
      setTouchedFields((prev) => ({ ...prev, [field]: true }));
      const err = validateField(field, formData[field], formData);
      setFieldErrors((prev) => ({ ...prev, [field]: err }));
    },
    [formData, validateField]
  );

  const goToDashboard = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setFieldErrors({});
    setTouchedFields({});
    setIsSubmitting(false);
    setGlobalError(null);
    setCurrentStep("dados");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setGlobalError(null);

      // Validação completa de todos os campos
      const newErrors: RegisterFieldErrors = {};
      (Object.keys(formData) as (keyof RegisterFormData)[]).forEach((field) => {
        const err = validateField(field, formData[field], formData);
        if (err) newErrors[field] = err;
      });

      setTouchedFields({
        name: true,
        cpf: true,
        siap: true,
        userType: true,
        email: true,
        password: true,
        confirmPassword: true,
      });

      setFieldErrors(newErrors);

      if (Object.keys(newErrors).length > 0) {
        return;
      }

      setIsSubmitting(true);

      try {
        const cleanCpf = formData.cpf.replace(/\D/g, "");

        // Chamada encapsulada através do authService
        const result = await authService.register({
          name: formData.name.trim(),
          cpf: cleanCpf,
          siap: formData.siap.trim(),
          ciap: formData.siap.trim(),
          userType: formData.userType,
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        });

        if (!result.success) {
          if (result.fieldErrors) {
            setFieldErrors(result.fieldErrors);
          }
          throw new Error(result.error || "Não foi possível concluir seu cadastro. Tente novamente.");
        }

        setCurrentStep("conclusao");
        onSuccess?.();

        if (autoRedirect) {
          redirectTimerRef.current = setTimeout(() => {
            goToDashboard();
          }, redirectDelayMs);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao cadastrar usuário.";
        setGlobalError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateField, autoRedirect, redirectDelayMs, onSuccess, goToDashboard]
  );

  return {
    currentStep,
    formData,
    fieldErrors,
    isSubmitting,
    globalError,
    handleFieldChange,
    handleFieldBlur,
    handleSubmit,
    goToDashboard,
    resetForm,
  };
}
