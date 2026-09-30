import { NextRequest } from "next/server";
import { userController } from "@/lib/controllers/user-controller";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return userController.handleUpdateFace(request);
}
