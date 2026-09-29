import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE /api/cadastros/[id] - Excluir cadastro com confirmação
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Cadastro não encontrado." },
        { status: 404 }
      );
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Cadastro excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir cadastro:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível excluir o cadastro." },
      { status: 500 }
    );
  }
}

// GET /api/cadastros/[id]
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        cpf: true,
        siap: true,
        userType: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Cadastro não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        ciap: user.siap,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar cadastro:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}
