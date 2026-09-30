export interface PersonValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  parsedDescriptor?: number[];
}

export function validatePersonData(
  name: unknown,
  faceDescriptor?: unknown
): PersonValidationResult {
  // 1. Validação do Nome
  if (typeof name !== "string") {
    return { valid: false, error: "O nome completo é obrigatório e deve ser um texto." };
  }

  const trimmedName = name.trim();

  if (trimmedName.length === 0) {
    return { valid: false, error: "O nome não pode estar vazio." };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: "O nome deve conter pelo menos 2 caracteres." };
  }

  if (trimmedName.length > 150) {
    return { valid: false, error: "O nome excede o limite máximo de 150 caracteres." };
  }

  // 2. Face Descriptor não é mais exigido nem utilizado no cadastro do sistema
  // Mantido apenas com suporte a parsing flexível caso enviado por compatibilidade
  let descriptorArray: number[] | undefined = undefined;

  if (faceDescriptor !== undefined && faceDescriptor !== null) {
    if (Array.isArray(faceDescriptor)) {
      descriptorArray = faceDescriptor;
    } else if (typeof faceDescriptor === "string") {
      try {
        const parsed = JSON.parse(faceDescriptor);
        if (Array.isArray(parsed)) {
          descriptorArray = parsed;
        }
      } catch {
        // Ignora se não for JSON válido, já que Face Descriptor não é mais exigido
      }
    }
  }

  return {
    valid: true,
    sanitizedName: trimmedName,
    parsedDescriptor: descriptorArray,
  };
}

export function validatePersonName(name: unknown): {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
} {
  if (typeof name !== "string") {
    return { valid: false, error: "O nome completo é obrigatório." };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: "O nome deve conter pelo menos 2 caracteres." };
  }
  if (trimmed.length > 150) {
    return { valid: false, error: "O nome excede o limite de 150 caracteres." };
  }

  return { valid: true, sanitizedName: trimmed };
}

/**
 * Validação rigorosa do algoritmo de dígitos verificadores de CPF
 */
export function isValidCPF(cpf: unknown): boolean {
  if (typeof cpf !== "string") return false;
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, "").slice(0, 11);
  return clean
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim().toLowerCase());
}

export const USER_TYPES = [
  "Graduação",
  "Pós-graduação",
  "Professor",
  "Servidor",
] as const;

export type UserType = (typeof USER_TYPES)[number];

export interface RegisterInputValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  data?: {
    name: string;
    cpf: string;
    siap: string;
    ciap: string;
    userType: UserType;
    email: string;
    password: string;
  };
}

export function validateRegisterFields(
  input: Record<string, any>
): RegisterInputValidationResult {
  const errors: Record<string, string> = {};

  // Nome
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) {
    errors.name = "O nome completo é obrigatório.";
  } else if (name.length < 2) {
    errors.name = "O nome deve conter pelo menos 2 caracteres.";
  } else if (name.length > 150) {
    errors.name = "O nome excede 150 caracteres.";
  }

  // CPF
  const rawCpf = typeof input.cpf === "string" ? input.cpf.trim() : "";
  const cleanCpf = rawCpf.replace(/\D/g, "");
  if (!cleanCpf) {
    errors.cpf = "O CPF é obrigatório.";
  } else if (!isValidCPF(cleanCpf)) {
    errors.cpf = "CPF inválido. Verifique os dígitos digitados.";
  }

  // SIAP
  const rawSiap = typeof input.siap === "string" ? input.siap : (typeof input.ciap === "string" ? input.ciap : "");
  const siap = rawSiap.trim();
  if (!siap) {
    errors.siap = "O SIAP é obrigatório.";
    errors.ciap = "O SIAP é obrigatório.";
  } else if (siap.length < 2) {
    errors.siap = "O SIAP deve conter pelo menos 2 caracteres.";
    errors.ciap = "O SIAP deve conter pelo menos 2 caracteres.";
  }

  // Tipo de Usuário
  const userType = input.userType as UserType;
  if (!userType || !USER_TYPES.includes(userType)) {
    errors.userType = "Selecione um tipo de usuário válido.";
  }

  // Email
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!email) {
    errors.email = "O e-mail é obrigatório.";
  } else if (!isValidEmail(email)) {
    errors.email = "Formato de e-mail inválido.";
  }

  // Senha
  const password = typeof input.password === "string" ? input.password : "";
  if (!password) {
    errors.password = "A senha é obrigatória.";
  } else if (password.length < 6) {
    errors.password = "A senha deve conter no mínimo 6 caracteres.";
  }

  // Confirmação de Senha
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  if (!confirmPassword) {
    errors.confirmPassword = "A confirmação de senha é obrigatória.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

  const valid = Object.keys(errors).length === 0;

  return {
    valid,
    errors,
    data: valid
      ? {
          name,
          cpf: cleanCpf,
          siap,
          ciap: siap,
          userType,
          email,
          password,
        }
      : undefined,
  };
}

