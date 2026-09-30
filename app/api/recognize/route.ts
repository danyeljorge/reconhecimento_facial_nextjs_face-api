/**
 * @deprecated ROTA LEGADA DE MATCHING FACIAL
 * 
 * ATENÇÃO ARQUITETURAL:
 * O fluxo oficial do sistema NÃO utiliza Face Descriptor nem matching para autenticação.
 * A autenticação do usuário é realizada exclusivamente via CPF + Senha.
 * A validação facial subsequente é estritamente de Prova de Vida (Liveness/Anti-Spoofing).
 */

import { NextRequest, NextResponse } from "next/server";
import { personRepository } from "@/lib/repositories/person-repository";
import {
  FACE_MATCH_THRESHOLD,
  compareFace,
} from "@/lib/face-recognition";

export const dynamic = "force-dynamic";

// GET /api/recognize - Retorna descriptors para compatibilidade
export async function GET() {
  try {
    const persons = await personRepository.getAllWithDescriptors();

    const parsedPersons = persons
      .map((p) => {
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
      })
      .filter((p) => Array.isArray(p.descriptor) && p.descriptor.length === 128);

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
    let body: any;
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

    const persons = await personRepository.getAllWithDescriptors();

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
