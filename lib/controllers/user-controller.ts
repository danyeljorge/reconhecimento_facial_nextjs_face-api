import { NextRequest, NextResponse } from "next/server";
import { userService, UserService } from "@/lib/services/user-service";
import { authService, AuthService } from "@/lib/services/auth-service";
import { turnstileService } from "@/lib/services/turnstile-service";
import { validateRegisterFields } from "@/lib/validation";

export class UserController {
  private service: UserService;
  private auth: AuthService;

  constructor(
    service: UserService = userService,
    auth: AuthService = authService
  ) {
    this.service = service;
    this.auth = auth;
  }

  /**
   * Coordenador da obtenção de perfil autenticado (GET /api/user/profile)
   */
  async handleGetProfile(): Promise<NextResponse> {
    try {
      const session = this.auth.getCurrentSession();
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Não autorizado. Sessão inexistente ou expirada." },
          { status: 401 }
        );
      }

      const profile = await this.service.getUserProfile(session.userId);

      if (!profile) {
        return NextResponse.json(
          { success: false, error: "Usuário não encontrado." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        profile,
      });
    } catch (error) {
      console.error("Erro no UserController.handleGetProfile:", error);
      return NextResponse.json(
        { success: false, error: "Erro interno ao carregar perfil." },
        { status: 500 }
      );
    }
  }

  /**
   * Coordenador da obtenção do extrato de movimentações (GET /api/user/statement)
   */
  async handleGetStatement(): Promise<NextResponse> {
    try {
      const session = this.auth.getCurrentSession();
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Não autorizado." },
          { status: 401 }
        );
      }

      const statement = await this.service.getUserStatement(session.userId);

      return NextResponse.json({
        success: true,
        statement,
      });
    } catch (error) {
      console.error("Erro no UserController.handleGetStatement:", error);
      return NextResponse.json(
        { success: false, error: "Erro interno ao carregar extrato." },
        { status: 500 }
      );
    }
  }

  /**
   * Coordenador da atualização de imagem facial pós-liveness (POST /api/user/face)
   */
  async handleUpdateFace(request: NextRequest): Promise<NextResponse> {
    try {
      const session = this.auth.getCurrentSession();
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Não autorizado. Faça login primeiro." },
          { status: 401 }
        );
      }

      let body: any;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "JSON inválido." },
          { status: 400 }
        );
      }

      const { faceImage } = body;

      if (!faceImage || typeof faceImage !== "string" || !faceImage.startsWith("data:image/")) {
        return NextResponse.json(
          { success: false, error: "Imagem facial inválida." },
          { status: 400 }
        );
      }

      const userProfile = await this.service.getUserProfile(session.userId);
      if (!userProfile) {
        return NextResponse.json(
          { success: false, error: "Usuário não encontrado." },
          { status: 404 }
        );
      }

      // Envia foto e metadados para a integração com a catraca / SISRU
      const turnstileResult = await turnstileService.sendPhotoToTurnstile({
        userId: userProfile.id,
        name: userProfile.name,
        cpf: userProfile.cpf,
        siap: userProfile.siap,
        userType: userProfile.userType,
        photoBase64: faceImage,
        timestamp: new Date().toISOString(),
      });

      // Se a flag SAVE_LOCAL_PHOTO não estiver ativa, não salva a imagem localmente (null)
      const photoToStore = turnstileService.shouldSaveLocalPhoto() ? faceImage : null;

      const completion = await this.service.completeVerification(
        session.userId,
        photoToStore
      );

      return NextResponse.json({
        success: true,
        message: "Presença validada e biometria despachada para a catraca com sucesso.",
        turnstileSync: turnstileResult,
        user: completion.user,
        nextVerificationTrigger: completion.nextVerificationTrigger,
      });
    } catch (error) {
      console.error("Erro no UserController.handleUpdateFace:", error);
      return NextResponse.json(
        { success: false, error: "Erro ao processar biometria facial." },
        { status: 500 }
      );
    }
  }

  /**
   * Coordenador de listagem de cadastros (GET /api/cadastros)
   */
  async handleListCadastros(): Promise<NextResponse> {
    try {
      const users = await this.service.listUsers();
      return NextResponse.json({
        success: true,
        count: users.length,
        users,
      });
    } catch (error) {
      console.error("Erro no UserController.handleListCadastros:", error);
      return NextResponse.json(
        { success: false, error: "Erro ao consultar cadastros." },
        { status: 500 }
      );
    }
  }

  /**
   * Coordenador de criação de cadastro na área administrativa (POST /api/cadastros)
   */
  async handleCreateCadastro(request: NextRequest): Promise<NextResponse> {
    try {
      let body: any;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "JSON inválido." },
          { status: 400 }
        );
      }

      const { name, cpf, siap, ciap, userType, email, password, confirmPassword } = body;
      const siapCode = siap || ciap;

      const result = await this.auth.register({
        name,
        cpf,
        siap: siapCode,
        ciap: siapCode,
        userType,
        email,
        password: password || "123456",
        confirmPassword: confirmPassword || password || "123456",
      });

      if (!result.success) {
        const isConflict = result.error.includes("já está cadastrado");
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            fieldErrors: result.fieldErrors,
          },
          { status: isConflict ? 409 : 400 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Cadastro criado com sucesso.",
          user: result.user,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Erro no UserController.handleCreateCadastro:", error);
      return NextResponse.json(
        { success: false, error: "Erro interno ao cadastrar." },
        { status: 500 }
      );
    }
  }

  /**
   * Coordenador de consulta por ID (GET /api/cadastros/[id])
   */
  async handleGetCadastroById(id: string): Promise<NextResponse> {
    try {
      const user = await this.service.getUserById(id);
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Cadastro não encontrado." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error("Erro no UserController.handleGetCadastroById:", error);
      return NextResponse.json(
        { success: false, error: "Erro interno do servidor." },
        { status: 500 }
      );
    }
  }

  /**
   * Coordenador de exclusão de cadastro (DELETE /api/cadastros/[id])
   */
  async handleDeleteCadastro(id: string): Promise<NextResponse> {
    try {
      const deleted = await this.service.deleteUser(id);
      if (!deleted) {
        return NextResponse.json(
          { success: false, error: "Cadastro não encontrado." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Cadastro excluído com sucesso.",
      });
    } catch (error) {
      console.error("Erro no UserController.handleDeleteCadastro:", error);
      return NextResponse.json(
        { success: false, error: "Não foi possível excluir o cadastro." },
        { status: 500 }
      );
    }
  }
}

export const userController = new UserController();
