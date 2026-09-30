import { NextRequest } from "next/server";
import { userController } from "@/lib/controllers/user-controller";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  return userController.handleGetCadastroById(params.id);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  return userController.handleDeleteCadastro(params.id);
}
