import { NextRequest, NextResponse } from "next/server";
import { authService, AuthService } from "@/lib/services/auth-service";

export class AuthController {
  private service: AuthService;

  constructor(service: AuthService = authService) {
    this.service = service;
  }

  /**
   * Coordenador do fluxo de login (POST /api/auth/login)
   */
  async handleLogin(request: NextRequest): Promise<NextResponse> {
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

      const { cpf, password } = body;

      const result = await this.service.login(cpf, password);

      if (!result.success) {
        const isAuthFail = result.error.includes("incorretos");
        return NextResponse.json(
          { success: false, error: result.error },
          { status: isAuthFail ? 401 : 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: result.message,
        user: result.user,
      });
    } catch (error) {
      console.error("Erro no AuthController.handleLogin:", error);
      return NextResponse.json(
        { success: false, error: "Erro interno ao processar login." },
        { status: 500 }
      );
    }
  }

  /**
   * Coordenador do fluxo de cadastro (POST /api/auth/register)
   */
  async handleRegister(request: NextRequest): Promise<NextResponse> {
    try {
      let body: any;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json(
          { success: false, error: "Corpo da requisição inválido. JSON esperado." },
          { status: 400 }
        );
      }

      const {
        name,
        cpf,
        siap,
        ciap,
        userType,
        email,
        password,
        confirmPassword,
        faceImage,
      } = body;

      const result = await this.service.register(
        {
          name,
          cpf,
          siap,
          ciap,
          userType,
          email,
          password,
          confirmPassword,
        },
        faceImage
      );

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
          message: result.message,
          user: result.user,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Erro no AuthController.handleRegister:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Não foi possível concluir seu cadastro. Tente novamente.",
        },
        { status: 500 }
      );
    }
  }

  /**
   * Coordenador do fluxo de logout (POST /api/auth/logout)
   */
  async handleLogout(): Promise<NextResponse> {
    this.service.logout();
    return NextResponse.json({
      success: true,
      message: "Sessão encerrada com sucesso.",
    });
  }

  /**
   * Coordenador da consulta de sessão ativa (GET /api/auth/session)
   */
  async handleSession(): Promise<NextResponse> {
    try {
      const profile = await this.service.getCurrentUserProfile();

      if (!profile) {
        return NextResponse.json(
          { authenticated: false, user: null },
          { status: 200 }
        );
      }

      return NextResponse.json({
        authenticated: true,
        user: profile,
      });
    } catch (error) {
      console.error("Erro no AuthController.handleSession:", error);
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }
  }
}

export const authController = new AuthController();
