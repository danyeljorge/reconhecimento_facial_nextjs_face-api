import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRegisterFields } from "@/lib/validation";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/cadastros - Listar todos os cadastros básicos
export async function GET() {
  try {
    const rawUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        cpf: true,
        siap: true,
        userType: true,
        email: true,
        faceImage: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const users = rawUsers.map((u) => ({
      ...u,
      ciap: u.siap,
    }));

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Erro ao listar cadastros:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao consultar cadastros." },
      { status: 500 }
    );
  }
}

// POST /api/cadastros - Criar novo cadastro básico (sem reconhecimento facial)
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

    const { name, cpf, siap, ciap, userType, email, password, confirmPassword } = body;
    const siapCode = siap || ciap;

    const validation = validateRegisterFields({
      name,
      cpf,
      siap: siapCode,
      ciap: siapCode,
      userType,
      email,
      password: password || "123456",
      confirmPassword: confirmPassword || password || "123456",
    });

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          error: "Dados incompletos ou inválidos.",
          fieldErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { data } = validation;

    // Verificar unicidade
    const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: "E-mail já cadastrado.", fieldErrors: { email: "E-mail já cadastrado." } },
        { status: 409 }
      );
    }

    const existingCpf = await prisma.user.findUnique({ where: { cpf: data.cpf } });
    if (existingCpf) {
      return NextResponse.json(
        { success: false, error: "CPF já cadastrado.", fieldErrors: { cpf: "CPF já cadastrado." } },
        { status: 409 }
      );
    }

    const existingSiap = await prisma.user.findUnique({ where: { siap: data.siap } });
    if (existingSiap) {
      return NextResponse.json(
        {
          success: false,
          error: "SIAP já cadastrado.",
          fieldErrors: { siap: "SIAP já cadastrado." },
        },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(data.password);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        cpf: data.cpf,
        siap: data.siap,
        userType: data.userType,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        siap: true,
        userType: true,
        email: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Cadastro criado com sucesso.",
        user: {
          ...newUser,
          ciap: newUser.siap,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao criar cadastro:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao cadastrar." },
      { status: 500 }
    );
  }
}
