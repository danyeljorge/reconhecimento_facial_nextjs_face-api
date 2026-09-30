import { NextRequest } from "next/server";
import { authController } from "@/lib/controllers/auth-controller";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return authController.handleLogin(request);
}
