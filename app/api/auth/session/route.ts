import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUserProfile } from "@/lib/services/user-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    const profile = await getUserProfile(session.userId);

    if (!profile) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: profile,
    });
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }
}
