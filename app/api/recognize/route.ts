import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

import {
  FACE_MATCH_THRESHOLD,
  compareFace,
} from "@/lib/face-recognition";

// GET /api/recognize - Retorna descriptors cadastrados para matching em tempo real no cliente
export async function GET() {
  try {
    const persons = await prisma.person.findMany({
      select: {
        id: true,
        name: true,
        faceDescriptor: true,
        createdAt: true,
      },
    });

    const parsedPersons = persons.map((p) => {
      let descriptor: number[] = [];
      try {
        descriptor = JSON.parse(p.faceDescriptor);
      } catch {
        descriptor = [];
      }
      return {
        id: p.id,
        name: p.name,
        descriptor,
        createdAt: p.createdAt,
      };
    }).filter(p => p.descriptor.length === 128);

    return NextResponse.json({
      success: true,
      count: parsedPersons.length,
      persons: parsedPersons,
    });
  } catch (error) {
    console.error("Erro ao obter descriptors para reconhecimento:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao consultar registros biométricos." },
      { status: 500 }
    );
  }
}

// POST /api/recognize - Reconhecer um Face Descriptor capturado
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

    const { faceDescriptor } = body;

    if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return NextResponse.json(
        { success: false, error: "Face descriptor inválido. Vetor de 128 valores esperado." },
        { status: 400 }
      );
    }

    // Busca todas as pessoas cadastradas no SQLite
    const persons = await prisma.person.findMany({
      select: {
        id: true,
        name: true,
        faceDescriptor: true,
        createdAt: true,
      },
    });

    if (persons.length === 0) {
      return NextResponse.json({
        success: true,
        recognized: false,
        message: "Nenhuma pessoa cadastrada no banco de dados.",
      });
    }

    const parsedPersons = persons
      .map((p) => {
        try {
          const descriptor = JSON.parse(p.faceDescriptor);
          if (Array.isArray(descriptor) && descriptor.length === 128) {
            return { id: p.id, name: p.name, descriptor, createdAt: p.createdAt };
          }
        } catch {
          // ignore corrupted
        }
        return null;
      })
      .filter((p): p is { id: string; name: string; descriptor: number[]; createdAt: Date } => p !== null);

    const { match, bestMatch } = compareFace(faceDescriptor, parsedPersons, FACE_MATCH_THRESHOLD);

    if (match) {
      const matchedPerson = parsedPersons.find((p) => p.id === match.id);
      return NextResponse.json({
        success: true,
        recognized: true,
        distance: match.distance,
        confidence: match.confidence,
        person: {
          id: match.id,
          name: match.name,
          createdAt: matchedPerson ? matchedPerson.createdAt : new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      recognized: false,
      distance: bestMatch ? bestMatch.distance : null,
      message: "Pessoa não reconhecida no sistema.",
    });
  } catch (error) {
    console.error("Erro na rota de reconhecimento:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno durante o reconhecimento." },
      { status: 500 }
    );
  }
}
