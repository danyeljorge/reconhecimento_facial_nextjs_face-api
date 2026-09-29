import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "JSON inválido." },
        { status: 400 }
      );
    }

    const { cpf, password } = body;

    if (!cpf || typeof cpf !== "string") {
      return NextResponse.json(
        { success: false, error: "Informe o CPF." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Informe a senha." },
        { status: 400 }
      );
    }

    const cleanCpf = cpf.replace(/\D/g, "");

    const user = await prisma.user.findUnique({
      where: { cpf: cleanCpf },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "CPF ou senha incorretos." },
        { status: 401 }
      );
    }

    const isMatch = verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "CPF ou senha incorretos." },
        { status: 401 }
      );
    }

    // Cria a sessão com cookie seguro httpOnly
    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    setSessionCookie(token);

    return NextResponse.json({
      success: true,
      message: "Login realizado com sucesso.",
      user: {
        id: user.id,
        name: user.name,
        cpf: user.cpf,
        email: user.email,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao processar login." },
      { status: 500 }
    );
  }
}
