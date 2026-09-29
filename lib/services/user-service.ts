import { prisma } from "@/lib/prisma";



export interface UserProfileDTO {
  id: string;
  name: string;
  cpf: string;
  siap: string;
  ciap: string;
  userType: string;
  email: string;
  faceImage?: string | null;
  createdAt: string;
}

export interface StatementItemDTO {
  id: string;
  date: string;
  description: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  category?: string;
}

export interface UserStatementDTO {
  balance: number;
  currency: string;
  items: StatementItemDTO[];
}

/**
 * Camada de serviço para obtenção do perfil do usuário.
 * No MVP obtém do banco SQLite local.
 * Futuramente poderá consultar uma API externa ou banco legado sem alterar os componentes frontend.
 */
export async function getUserProfile(userId: string): Promise<UserProfileDTO | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      cpf: true,
      siap: true,
      userType: true,
      email: true,
      faceImage: true,
      createdAt: true,
    },
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    cpf: user.cpf,
    siap: user.siap,
    ciap: user.siap,
    userType: user.userType,
    email: user.email,
    faceImage: user.faceImage,
    createdAt: user.createdAt.toISOString(),
  };
}

/**
 * Camada de serviço para obtenção do extrato de movimentações.
 * No MVP retorna a estrutura preparada vazia (sem dados falsos, conforme Seção 16).
 * Futuramente integrará com APIs de créditos/compras/saldo.
 */
export async function getUserStatement(userId: string): Promise<UserStatementDTO> {
  // Garantir que o usuário existe
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new Error("Usuário não encontrado.");
  }

  // No MVP: estrutura pronta para dados reais futuros, mantendo extrato vazio
  return {
    balance: 0.0,
    currency: "BRL",
    items: [],
  };
}
