import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Cálculo da distância euclidiana entre dois vetores de 128 dimensões
function euclideanDistance(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    const diff = v1[i] - v2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

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

    // Limiar de reconhecimento padrão de modelos face-api / dlib:
    // Distância <= 0.55 indica a mesma pessoa com altíssima precisão
    const MATCH_THRESHOLD = 0.55;

    let bestMatch: {
      person: { id: string; name: string; createdAt: Date };
      distance: number;
    } | null = null;

    for (const person of persons) {
      try {
        const storedDescriptor = JSON.parse(person.faceDescriptor);
        if (Array.isArray(storedDescriptor) && storedDescriptor.length === 128) {
          const distance = euclideanDistance(faceDescriptor, storedDescriptor);
          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = { person, distance };
          }
        }
      } catch (err) {
        console.error(`Erro ao analisar descriptor da pessoa ID ${person.id}:`, err);
      }
    }

    if (bestMatch && bestMatch.distance <= MATCH_THRESHOLD) {
      // Confiança percentual estimada
      const confidence = Math.round(
        Math.max(0, Math.min(100, (1 - bestMatch.distance / MATCH_THRESHOLD) * 100))
      );

      return NextResponse.json({
        success: true,
        recognized: true,
        distance: Number(bestMatch.distance.toFixed(4)),
        confidence: Math.max(50, 100 - Math.round(bestMatch.distance * 80)),
        person: {
          id: bestMatch.person.id,
          name: bestMatch.person.name,
          createdAt: bestMatch.person.createdAt,
        },
      });
    }

    return NextResponse.json({
      success: true,
      recognized: false,
      distance: bestMatch ? Number(bestMatch.distance.toFixed(4)) : null,
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
