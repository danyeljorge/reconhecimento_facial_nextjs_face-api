import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalPersons, lastPerson] = await Promise.all([
      prisma.person.count(),
      prisma.person.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      totalPersons,
      lastRegistration: lastPerson ? lastPerson.createdAt : null,
    });
  } catch (error) {
    console.error("Erro ao obter estatísticas:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao obter estatísticas." },
      { status: 500 }
    );
  }
}
