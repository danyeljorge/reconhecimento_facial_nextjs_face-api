import { clientApiFetch } from "@/lib/client-api";
import { UserProfileDTO, UserStatementDTO } from "@/lib/services/user-service";

export interface UserStatementResponse {
  success: boolean;
  statement?: UserStatementDTO;
  error?: string;
}

export interface UserFaceResponse {
  success: boolean;
  user?: UserProfileDTO;
  error?: string;
}

export class UserApiService {
  async getStatement(): Promise<UserStatementResponse> {
    try {
      const response = await clientApiFetch("/api/user/statement");
      return await response.json();
    } catch {
      return { success: false, error: "Não foi possível carregar o extrato." };
    }
  }

  async updateFaceImage(faceImage: string): Promise<UserFaceResponse> {
    try {
      const response = await clientApiFetch("/api/user/face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceImage }),
      });

      return await response.json();
    } catch {
      return { success: false, error: "Não foi possível atualizar a biometria." };
    }
  }
}

export const userApiService = new UserApiService();