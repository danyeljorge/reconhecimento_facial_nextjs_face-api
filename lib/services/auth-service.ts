import { userRepository, IUserRepository } from "../repositories/user-repository";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getCurrentSession,
} from "../auth";
import { validateRegisterFields } from "../validation";
import {
  RegisterUserInput,
  AuthResult,
  UserProfileDTO,
  SessionPayload,
} from "../types";

export class AuthService {
  private userRepo: IUserRepository;

  constructor(userRepo: IUserRepository = userRepository) {
    this.userRepo = userRepo;
  }

  /**
   * Autentica o usuário exclusivamente via CPF e Senha
   */
  async login(cpf: string, password: string): Promise<AuthResult> {
    if (!cpf || typeof cpf !== "string") {
      return { success: false, error: "Informe o CPF." };
    }

    if (!password || typeof password !== "string") {
      return { success: false, error: "Informe a senha." };
    }

    const cleanCpf = cpf.replace(/\D/g, "");

    const user = await this.userRepo.findByCpf(cleanCpf);

    if (!user) {
      return { success: false, error: "CPF ou senha incorretos." };
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: "CPF ou senha incorretos." };
    }

    // Registra o acesso e avalia a necessidade de liveness (novo cadastro ou auditoria aleatória 3-5)
    const evaluation = await this.userRepo.recordAccessAndEvaluateVerification(user.id);

    // Cria token assinado e configura cookie seguro
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    setSessionCookie(token);

    return {
      success: true,
      message: "Login realizado com sucesso.",
      user: {
        id: user.id,
        name: user.name,
        cpf: user.cpf,
        email: user.email,
        userType: user.userType,
        siap: user.siap,
        ciap: user.siap,
        hasFaceRegistered: evaluation.profile.hasFaceRegistered,
        requiresVerification: evaluation.requiresVerification,
        verificationReason: evaluation.verificationReason,
      },
    };
  }

  /**
   * Realiza o cadastro do usuário garantindo integridade e unicidade dos dados
   */
  async register(
    input: RegisterUserInput,
    faceImage?: string | null
  ): Promise<AuthResult> {
    const siapValue = input.siap || input.ciap || "";

    const validation = validateRegisterFields({
      name: input.name,
      cpf: input.cpf,
      siap: siapValue,
      ciap: siapValue,
      userType: input.userType,
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
    });

    if (!validation.valid || !validation.data) {
      return {
        success: false,
        error: "Campos inválidos ou incompletos.",
        fieldErrors: validation.errors,
      };
    }

    const { data } = validation;

    // Verificação de duplicidades no repositório
    const existingEmail = await this.userRepo.findByEmail(data.email);
    if (existingEmail) {
      return {
        success: false,
        error: "Este e-mail já está cadastrado no sistema.",
        fieldErrors: { email: "Este e-mail já está cadastrado." },
      };
    }

    const existingCpf = await this.userRepo.findByCpf(data.cpf);
    if (existingCpf) {
      return {
        success: false,
        error: "Este CPF já está cadastrado no sistema.",
        fieldErrors: { cpf: "Este CPF já está cadastrado." },
      };
    }

    const existingSiap = await this.userRepo.findBySiap(data.siap);
    if (existingSiap) {
      return {
        success: false,
        error: "Este SIAP já está cadastrado no sistema.",
        fieldErrors: { siap: "Este SIAP já está cadastrado." },
      };
    }

    // Criptografia segura da senha (scrypt com salt aleatório)
    const passwordHash = hashPassword(data.password);

    const storedFaceImage =
      typeof faceImage === "string" && faceImage.startsWith("data:image/")
        ? faceImage
        : null;

    const newUser = await this.userRepo.create({
      name: data.name,
      cpf: data.cpf,
      siap: data.siap,
      userType: data.userType,
      email: data.email,
      passwordHash,
      faceImage: storedFaceImage,
    });

    // Cria sessão autenticada automaticamente
    const token = createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    setSessionCookie(token);

    return {
      success: true,
      message: "Cadastro concluído com sucesso.",
      user: {
        id: newUser.id,
        name: newUser.name,
        cpf: newUser.cpf,
        email: newUser.email,
        userType: newUser.userType,
        siap: newUser.siap,
        ciap: newUser.siap,
      },
    };
  }

  /**
   * Encerra a sessão ativa limpando os cookies
   */
  logout(): void {
    clearSessionCookie();
  }

  /**
   * Obtém a sessão atual a partir dos cookies
   */
  getCurrentSession(): SessionPayload | null {
    return getCurrentSession();
  }

  /**
   * Obtém o perfil do usuário atualmente autenticado
   */
  async getCurrentUserProfile(): Promise<UserProfileDTO | null> {
    const session = this.getCurrentSession();
    if (!session) return null;
    const profile = await this.userRepo.findProfileById(session.userId);
    if (!profile) return null;

    // Avalia o status para a sessão ativa (sem incrementar o contador de acesso)
    const requiresVerification =
      !profile.hasFaceRegistered ||
      profile.accessCountSinceLastVerification >= (profile.nextVerificationTrigger || 3);

    const verificationReason = !profile.hasFaceRegistered
      ? "CADASTRO_INICIAL"
      : requiresVerification
      ? "AUDITORIA_ALEATORIA"
      : null;

    return {
      ...profile,
      requiresVerification,
      verificationReason,
    };
  }
}

export const authService = new AuthService();
