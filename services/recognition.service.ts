import { clientApiFetch } from "@/lib/client-api";

export interface RecognitionPersonItem {
  id: string;
  name: string;
  descriptor: number[];
}

export interface RecognitionListResponse {
  success: boolean;
  persons?: RecognitionPersonItem[];
  error?: string;
}

export class RecognitionService {
  async listPersons(): Promise<RecognitionListResponse> {
    try {
      const response = await clientApiFetch("/api/recognize");
      return await response.json();
    } catch {
      return { success: false, error: "Não foi possível carregar pessoas para reconhecimento." };
    }
  }
}

export const recognitionService = new RecognitionService();