import { clientApiFetch } from "@/lib/client-api";
import { RegisterPayload, RegisterResponse } from "@/types/registration";

export class AuthClientService {
  private basePath: string;

  constructor(basePath: string = "/api/auth") {
    this.basePath = basePath;
  }

  /**
   * Realiza a requisição de cadastro para a rota da API
   */
  async register(payload: RegisterPayload): Promise<RegisterResponse> {
    try {
      const response = await clientApiFetch(`${this.basePath}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        return {
          success: false,
          error:
            data?.error ||
            "Não foi possível concluir seu cadastro. Verifique os dados e tente novamente.",
          fieldErrors: data?.fieldErrors,
        };
      }

      return {
        success: true,
        message: data.message || "Cadastro realizado com sucesso.",
        user: data.user,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro de conexão ao tentar registrar. Verifique sua internet.";
      return {
        success: false,
        error: message,
      };
    }
  }

  /**
   * Realiza a autenticação de login
   */
  async login(credentials: { cpf: string; password: string }) {
    try {
      const response = await clientApiFetch(`${this.basePath}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: "Falha de conexão ao autenticar.",
      };
    }
  }

  /**
   * Obtém os dados da sessão autenticada ativa
   */
  async getSession() {
    try {
      const response = await clientApiFetch(`${this.basePath}/session`);
      return await response.json();
    } catch {
      return { authenticated: false, user: null };
    }
  }

  /**
   * Encerra a sessão
   */
  async logout() {
    try {
      const response = await clientApiFetch(`${this.basePath}/logout`, { method: "POST" });
      return await response.json();
    } catch {
      return { success: false };
    }
  }
}

export const authClientService = new AuthClientService();
export const authService = authClientService;
