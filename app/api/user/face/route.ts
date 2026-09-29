import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = getCurrentSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Faça login primeiro." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { faceImage } = body;

    if (!faceImage || typeof faceImage !== "string" || !faceImage.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, error: "Imagem facial inválida." },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: { faceImage },
      select: { id: true, name: true, faceImage: true },
    });

    return NextResponse.json({
      success: true,
      message: "Imagem de confirmação de presença atualizada com sucesso.",
      user: updated,
    });
  } catch (error) {
    console.error("Erro ao salvar biometria facial:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao atualizar biometria facial." },
      { status: 500 }
    );
  }
}
