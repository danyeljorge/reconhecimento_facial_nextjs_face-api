import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserStatement } from "@/lib/services/user-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Não autorizado." },
        { status: 401 }
      );
    }

    const statement = await getUserStatement(session.userId);

    return NextResponse.json({
      success: true,
      statement,
    });
  } catch (error) {
    console.error("Erro ao obter extrato:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao carregar extrato." },
      { status: 500 }
    );
  }
}
