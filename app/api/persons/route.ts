import { NextRequest, NextResponse } from "next/server";
import { personRepository } from "@/lib/repositories/person-repository";
import { validatePersonData } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/persons - Listar pessoas cadastradas (via PersonRepository)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("countOnly") === "true";

    if (countOnly) {
      const count = await personRepository.count();
      return NextResponse.json({ count });
    }

    const persons = await personRepository.listAll();

    return NextResponse.json({
      success: true,
      count: persons.length,
      persons,
    });
  } catch (error) {
    console.error("Erro ao listar pessoas:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao consultar cadastros." },
      { status: 500 }
    );
  }
}

// POST /api/persons - Cadastrar pessoa
export async function POST(request: NextRequest) {
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

    const { name, faceDescriptor } = body;

    const validation = validatePersonData(name, faceDescriptor);
    if (!validation.valid || !validation.sanitizedName) {
      return NextResponse.json(
        { success: false, error: validation.error || "Dados inválidos." },
        { status: 400 }
      );
    }

    const serializedDescriptor = validation.parsedDescriptor
      ? JSON.stringify(validation.parsedDescriptor)
      : "[]";

    const newPerson = await personRepository.create({
      name: validation.sanitizedName,
      faceDescriptor: serializedDescriptor,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Pessoa cadastrada com sucesso.",
        person: newPerson,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao cadastrar pessoa:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível realizar o cadastro no banco de dados. Tente novamente.",
      },
      { status: 500 }
    );
  }
}
