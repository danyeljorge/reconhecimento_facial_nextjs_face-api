import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePersonName } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/persons/[id] - Obter detalhes de um cadastro
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    const person = await prisma.person.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!person) {
      return NextResponse.json(
        { success: false, error: "Pessoa não encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, person });
  } catch (error) {
    console.error("Erro ao buscar pessoa:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor." },
      { status: 500 }
    );
  }
}

// PATCH /api/persons/[id] - Atualizar nome da pessoa
// Conforme requisito 13: "A edição do nome não deve gerar um novo Face Descriptor. O descriptor pertence à identidade facial cadastrada."
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "JSON inválido." },
        { status: 400 }
      );
    }

    const { name } = body;
    const validation = validatePersonName(name);

    if (!validation.valid || !validation.sanitizedName) {
      return NextResponse.json(
        { success: false, error: validation.error || "Nome inválido." },
        { status: 400 }
      );
    }

    // Verifica se a pessoa existe
    const existing = await prisma.person.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Cadastro não encontrado." },
        { status: 404 }
      );
    }

    // Atualiza estritamente apenas o nome
    const updatedPerson = await prisma.person.update({
      where: { id },
      data: {
        name: validation.sanitizedName,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Nome atualizado com sucesso.",
      person: updatedPerson,
    });
  } catch (error) {
    console.error("Erro ao atualizar nome:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível atualizar o cadastro." },
      { status: 500 }
    );
  }
}

// DELETE /api/persons/[id] - Excluir pessoa do banco de dados
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    const existing = await prisma.person.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Cadastro não encontrado." },
        { status: 404 }
      );
    }

    await prisma.person.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Cadastro excluído com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao excluir pessoa:", error);
    return NextResponse.json(
      { success: false, error: "Não foi possível excluir o cadastro." },
      { status: 500 }
    );
  }
}
