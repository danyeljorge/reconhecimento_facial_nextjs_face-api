import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePersonData } from "@/lib/validation";

export const dynamic = "force-dynamic";

// GET /api/persons - Listar pessoas cadastradas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countOnly = searchParams.get("countOnly") === "true";

    if (countOnly) {
      const count = await prisma.person.count();
      return NextResponse.json({ count });
    }

    // Retorna pessoas cadastradas ordenadas pela data mais recente
    // Por segurança e privacidade biométrica, o faceDescriptor numérico não é retornado na listagem comum
    const persons = await prisma.person.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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

// POST /api/persons - Cadastrar nova pessoa com Face Descriptor
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Corpo da requisição inválido. JSON esperado." },
        { status: 400 }
      );
    }

    const { name, faceDescriptor } = body;

    // Validação rigorosa dos dados
    const validation = validatePersonData(name, faceDescriptor);
    if (!validation.valid || !validation.sanitizedName || !validation.parsedDescriptor) {
      return NextResponse.json(
        { success: false, error: validation.error || "Dados inválidos." },
        { status: 400 }
      );
    }

    // Serialização do vetor para persistência no SQLite
    const serializedDescriptor = JSON.stringify(validation.parsedDescriptor);

    // Salva no banco de dados local SQLite
    const newPerson = await prisma.person.create({
      data: {
        name: validation.sanitizedName,
        faceDescriptor: serializedDescriptor,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
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
