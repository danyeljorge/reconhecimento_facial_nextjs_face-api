import { clientApiFetch } from "@/lib/client-api";
import { RegisterPayload, RegisterResponse } from "@/types/registration";

export interface CadastroUserSummary {
  id: string;
  name: string;
  cpf: string;
  siap: string;
  ciap?: string;
  userType: string;
  email: string;
  faceImage?: string | null;
  hasFaceRegistered?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CadastrosListResponse {
  success: boolean;
  users?: CadastroUserSummary[];
  error?: string;
}

export interface CadastrosMutationResponse {
  success: boolean;
  error?: string;
}

export class CadastrosClientService {
  async list(): Promise<CadastrosListResponse> {
    try {
      const response = await clientApiFetch("/api/cadastros");
      return await response.json();
    } catch {
      return { success: false, error: "Não foi possível carregar os cadastros." };
    }
  }

  async create(payload: RegisterPayload): Promise<RegisterResponse> {
    try {
      const response = await clientApiFetch("/api/cadastros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return await response.json();
    } catch {
      return {
        success: false,
        error: "Não foi possível criar o cadastro.",
      };
    }
  }

  async remove(id: string): Promise<CadastrosMutationResponse> {
    try {
      const response = await clientApiFetch(`/api/cadastros/${id}`, {
        method: "DELETE",
      });

      return await response.json();
    } catch {
      return { success: false, error: "Erro ao excluir o cadastro." };
    }
  }
}

export const cadastrosService = new CadastrosClientService();