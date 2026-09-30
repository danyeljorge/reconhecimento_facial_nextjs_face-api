import { userRepository, IUserRepository } from "../repositories/user-repository";
import {
  UserProfileDTO,
  StatementItemDTO,
  UserStatementDTO,
  UserListItemDTO,
} from "../types";

export type { UserProfileDTO, StatementItemDTO, UserStatementDTO, UserListItemDTO };

export class UserService {
  private userRepo: IUserRepository;

  constructor(userRepo: IUserRepository = userRepository) {
    this.userRepo = userRepo;
  }

  /**
   * Obtém o perfil público do usuário através do repositório
   */
  async getUserProfile(userId: string): Promise<UserProfileDTO | null> {
    return this.userRepo.findProfileById(userId);
  }

  /**
   * Obtém o extrato de movimentações do usuário.
   * No MVP, valida a existência do usuário e retorna a estrutura preparada (sem dados falsos).
   */
  async getUserStatement(userId: string): Promise<UserStatementDTO> {
    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    return {
      balance: 0.0,
      currency: "BRL",
      items: [],
    };
  }

  /**
   * Lista todos os usuários cadastrados
   */
  async listUsers(): Promise<UserListItemDTO[]> {
    return this.userRepo.listAll();
  }

  /**
   * Obtém um cadastro específico por ID
   */
  async getUserById(id: string): Promise<UserProfileDTO | null> {
    return this.userRepo.findProfileById(id);
  }

  /**
   * Exclui um cadastro do sistema
   */
  async deleteUser(id: string): Promise<boolean> {
    const existing = await this.userRepo.findById(id);
    if (!existing) {
      return false;
    }
    return this.userRepo.deleteById(id);
  }

  /**
   * Atualiza a imagem facial pós-liveness
   */
  async updateFaceImage(userId: string, faceImage: string) {
    return this.userRepo.updateFaceImage(userId, faceImage);
  }
}

// Instância singleton do serviço
export const userService = new UserService();

// Funções de compatibilidade para código existente
export async function getUserProfile(userId: string): Promise<UserProfileDTO | null> {
  return userService.getUserProfile(userId);
}

export async function getUserStatement(userId: string): Promise<UserStatementDTO> {
  return userService.getUserStatement(userId);
}
