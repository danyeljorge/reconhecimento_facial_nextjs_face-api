import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateRegisterFields } from "@/lib/validation";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Corpo da requisição inválido. JSON esperado." },
        { status: 400 }
      );
    }

    const {
      name,
      cpf,
      siap,
      ciap,
      userType,
      email,
      password,
      confirmPassword,
      faceImage,
    } = body;

    const siapValue = siap || ciap;

    // 1. Validações dos campos do formulário
    const validation = validateRegisterFields({
      name,
      cpf,
      siap: siapValue,
      ciap: siapValue,
      userType,
      email,
      password,
      confirmPassword,
    });

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        {
          success: false,
          error: "Campos inválidos ou incompletos.",
          fieldErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // 2. Imagem facial é opcional no cadastro (o reconhecimento facial ocorre após o login)
    const storedFaceImage =
      typeof faceImage === "string" && faceImage.startsWith("data:image/")
        ? faceImage
        : null;


    const validData = validation.data;

    // 3. Verificação de unicidade no banco SQL: E-mail
    const existingEmail = await prisma.user.findUnique({
      where: { email: validData.email },
    });
    if (existingEmail) {
      return NextResponse.json(
        {
          success: false,
          error: "Este e-mail já está cadastrado no sistema.",
          fieldErrors: { email: "Este e-mail já está cadastrado." },
        },
        { status: 409 }
      );
    }

    // 4. Verificação de unicidade no banco SQL: CPF
    const existingCpf = await prisma.user.findUnique({
      where: { cpf: validData.cpf },
    });
    if (existingCpf) {
      return NextResponse.json(
        {
          success: false,
          error: "Este CPF já está cadastrado no sistema.",
          fieldErrors: { cpf: "Este CPF já está cadastrado." },
        },
        { status: 409 }
      );
    }

    // 5. Verificação de unicidade no banco SQL: SIAP
    const existingSiap = await prisma.user.findUnique({
      where: { siap: validData.siap },
    });
    if (existingSiap) {
      return NextResponse.json(
        {
          success: false,
          error: "Este SIAP já está cadastrado no sistema.",
          fieldErrors: { siap: "Este SIAP já está cadastrado." },
        },
        { status: 409 }
      );
    }

    // 6. Criptografia segura da senha (nunca em texto puro)
    const passwordHash = hashPassword(validData.password);

    // 7. Persistência no SQLite com a imagem facial conforme item 12 e 13
    const newUser = await prisma.user.create({
      data: {
        name: validData.name,
        cpf: validData.cpf,
        siap: validData.siap,
        userType: validData.userType,
        email: validData.email,
        passwordHash,
        faceImage: storedFaceImage,
      },
      select: {
        id: true,
        name: true,
        cpf: true,
        siap: true,
        userType: true,
        email: true,
        createdAt: true,
      },
    });

    const responseUser = {
      ...newUser,
      ciap: newUser.siap,
    };

    // 8. Criação automática da sessão (Item 15)
    const token = createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      name: newUser.name,
    });

    setSessionCookie(token);

    return NextResponse.json(
      {
        success: true,
        message: "Cadastro concluído com sucesso.",
        user: responseUser,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro durante cadastro do usuário:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Não foi possível concluir seu cadastro. Tente novamente.",
      },
      { status: 500 }
    );
  }
}
