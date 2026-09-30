import { userController } from "@/lib/controllers/user-controller";

export const dynamic = "force-dynamic";

export async function GET() {
  return userController.handleGetProfile();
}
