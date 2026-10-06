import { prisma } from "../prisma";
import { CreateUserData, UserListItemDTO, UserProfileDTO } from "../types";

export interface IUserRepository {
  findById(id: string): Promise<any | null>;
  findProfileById(id: string): Promise<UserProfileDTO | null>;
  findByCpf(cpf: string): Promise<any | null>;
  findByEmail(email: string): Promise<any | null>;
  findBySiap(siap: string): Promise<any | null>;
  create(data: CreateUserData): Promise<UserProfileDTO>;
  updateFaceImage(id: string, faceImage: string | null): Promise<{ id: string; name: string; faceImage: string | null }>;
  recordAccessAndEvaluateVerification(id: string): Promise<{
    profile: UserProfileDTO;
    requiresVerification: boolean;
    verificationReason: "CADASTRO_INICIAL" | null;
  }>;
  completeVerification(
    id: string,
    faceImage?: string | null
  ): Promise<{
    user: UserProfileDTO;
  }>;
  listAll(): Promise<UserListItemDTO[]>;
  deleteById(id: string): Promise<boolean>;
  count(): Promise<number>;
}

export class UserRepositoryPrisma implements IUserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findProfileById(id: string): Promise<UserProfileDTO | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cpf: true,
        siap: true,
        userType: true,
        email: true,
        faceImage: true,
        hasFaceRegistered: true,
        accessCountSinceLastVerification: true,
        nextVerificationTrigger: true,
        lastVerificationAt: true,
        createdAt: true,
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      cpf: user.cpf,
      siap: user.siap,
      ciap: user.siap,
      userType: user.userType,
      email: user.email,
      faceImage: user.faceImage,
      hasFaceRegistered: user.hasFaceRegistered,
      accessCountSinceLastVerification: user.accessCountSinceLastVerification,
      nextVerificationTrigger: user.nextVerificationTrigger,
      lastVerificationAt: user.lastVerificationAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async findByCpf(cpf: string) {
    return prisma.user.findUnique({
      where: { cpf },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async findBySiap(siap: string) {
    return prisma.user.findFirst({
      where: { siap },
    });
  }

  async create(data: CreateUserData): Promise<UserProfileDTO> {
    const created = await prisma.user.create({
      data: {
        name: data.name,
        cpf: data.cpf,
        siap: data.siap,
        userType: data.userType,
        email: data.email,
        passwordHash: data.passwordHash,
        faceImage: data.faceImage || null,
        hasFaceRegistered: false,
        accessCountSinceLastVerification: 0,
        nextVerificationTrigger: 0,
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        siap: true,
        userType: true,
        email: true,
        faceImage: true,
        hasFaceRegistered: true,
        accessCountSinceLastVerification: true,
        nextVerificationTrigger: true,
        lastVerificationAt: true,
        createdAt: true,
      },
    });

    return {
      id: created.id,
      name: created.name,
      cpf: created.cpf,
      siap: created.siap,
      ciap: created.siap,
      userType: created.userType,
      email: created.email,
      faceImage: created.faceImage,
      hasFaceRegistered: created.hasFaceRegistered,
      accessCountSinceLastVerification: created.accessCountSinceLastVerification,
      nextVerificationTrigger: created.nextVerificationTrigger,
      lastVerificationAt: created.lastVerificationAt?.toISOString() || null,
      requiresVerification: true,
      verificationReason: "CADASTRO_INICIAL",
      createdAt: created.createdAt.toISOString(),
    };
  }

  async updateFaceImage(id: string, faceImage: string | null) {
    return prisma.user.update({
      where: { id },
      data: { faceImage },
      select: {
        id: true,
        name: true,
        faceImage: true,
      },
    });
  }

  async recordAccessAndEvaluateVerification(id: string): Promise<{
    profile: UserProfileDTO;
    requiresVerification: boolean;
    verificationReason: "CADASTRO_INICIAL" | null;
  }> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    // Regra 1: Se o usuário ainda não tem o rosto cadastrado, DEVE cadastrar
    if (!user.hasFaceRegistered) {
      const profile = await this.findProfileById(id);
      return {
        profile: {
          ...profile!,
          requiresVerification: true,
          verificationReason: "CADASTRO_INICIAL",
        },
        requiresVerification: true,
        verificationReason: "CADASTRO_INICIAL",
      };
    }

    const profile = await this.findProfileById(id);

    return {
      profile: {
        ...profile!,
        requiresVerification: false,
        verificationReason: null,
      },
      requiresVerification: false,
      verificationReason: null,
    };
  }

  async completeVerification(
    id: string,
    faceImage?: string | null
  ): Promise<{
    user: UserProfileDTO;
  }> {
    const updated = await prisma.user.update({
      where: { id },
      data: {
        hasFaceRegistered: true,
        accessCountSinceLastVerification: 0,
        nextVerificationTrigger: 0,
        lastVerificationAt: new Date(),
        ...(faceImage !== undefined ? { faceImage } : {}),
      },
    });

    const profile = (await this.findProfileById(id))!;

    return {
      user: {
        ...profile,
        requiresVerification: false,
        verificationReason: null,
      },
    };
  }

  async listAll(): Promise<UserListItemDTO[]> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        cpf: true,
        siap: true,
        userType: true,
        email: true,
        faceImage: true,
        hasFaceRegistered: true,
        accessCountSinceLastVerification: true,
        nextVerificationTrigger: true,
        lastVerificationAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      cpf: u.cpf,
      siap: u.siap,
      ciap: u.siap,
      userType: u.userType,
      email: u.email,
      faceImage: u.faceImage,
      hasFaceRegistered: u.hasFaceRegistered,
      accessCountSinceLastVerification: u.accessCountSinceLastVerification,
      nextVerificationTrigger: u.nextVerificationTrigger,
      lastVerificationAt: u.lastVerificationAt?.toISOString() || null,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }));
  }

  async deleteById(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  async count(): Promise<number> {
    return prisma.user.count();
  }
}

export const userRepository: IUserRepository = new UserRepositoryPrisma();
