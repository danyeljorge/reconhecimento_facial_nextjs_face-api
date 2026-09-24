export interface PersonValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
  parsedDescriptor?: number[];
}

export function validatePersonData(
  name: unknown,
  faceDescriptor: unknown
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

  // 2. Validação do Face Descriptor
  if (!faceDescriptor) {
    return { valid: false, error: "O Face Descriptor facial é obrigatório." };
  }

  let descriptorArray: number[];

  if (Array.isArray(faceDescriptor)) {
    descriptorArray = faceDescriptor;
  } else if (typeof faceDescriptor === "string") {
    try {
      const parsed = JSON.parse(faceDescriptor);
      if (Array.isArray(parsed)) {
        descriptorArray = parsed;
      } else {
        return { valid: false, error: "O Face Descriptor possui formato inválido." };
      }
    } catch {
      return { valid: false, error: "O Face Descriptor não é um JSON válido." };
    }
  } else {
    return { valid: false, error: "Formato do Face Descriptor inválido." };
  }

  // O vetor facial padrão do face-api.js possui exatamente 128 dimensões
  if (descriptorArray.length !== 128) {
    return {
      valid: false,
      error: `O Face Descriptor deve conter exatamente 128 valores numéricos (recebido: ${descriptorArray.length}).`,
    };
  }

  // Verificar se todos os itens são números finitos válidos
  for (let i = 0; i < descriptorArray.length; i++) {
    const val = descriptorArray[i];
    if (typeof val !== "number" || isNaN(val) || !isFinite(val)) {
      return {
        valid: false,
        error: `O Face Descriptor contém valor inválido no índice ${i}.`,
      };
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
