import { NextRequest, NextResponse } from "next/server";
import { personRepository } from "@/lib/repositories/person-repository";
import { validatePersonName } from "@/lib/validation";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/persons/[id]
export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;
    const person = await personRepository.findById(id);

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
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = params;

    let body: any;
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

    const existing = await personRepository.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Cadastro não encontrado." },
        { status: 404 }
      );
    }

    const updatedPerson = await personRepository.updateName(id, validation.sanitizedName);

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

    const existing = await personRepository.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Cadastro não encontrado." },
        { status: 404 }
      );
    }

    await personRepository.deleteById(id);

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
