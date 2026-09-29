import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProfile } from "@/lib/services/user-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Não autorizado. Sessão inexistente ou expirada." },
        { status: 401 }
      );
    }

    const profile = await getUserProfile(session.userId);

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile,
    });
  } catch (error) {
    console.error("Erro ao obter perfil:", error);
    return NextResponse.json(
      { success: false, error: "Erro interno ao carregar perfil." },
      { status: 500 }
    );
  }
}
