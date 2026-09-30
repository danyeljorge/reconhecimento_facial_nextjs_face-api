import { NextResponse } from "next/server";
import { personRepository } from "@/lib/repositories/person-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalPersons, lastPerson] = await Promise.all([
      personRepository.count(),
      personRepository.findFirstLatest(),
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
