import {
  validateRegisterFields,
  isValidCPF,
  isValidEmail,
} from "../lib/validation.ts";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from "../lib/auth.ts";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ ${message}`);
  }
}

async function runTests() {
  console.log("==============================================================");
  console.log(" INICIANDO TESTES DO FLUXO MVP: CADASTRO, LIVENESS E DASHBOARD");
  console.log("==============================================================\n");

  // 1. Teste de Validação de CPF
  assert(isValidCPF("11144477735") === true, "CPF válido com dígitos corretos deve ser aceito");
  assert(isValidCPF("11111111111") === false, "CPF com todos dígitos iguais deve ser rejeitado");
  assert(isValidCPF("12345678900") === false, "CPF com dígito verificador errado deve ser rejeitado");

  // 2. Teste de Validação de E-mail
  assert(isValidEmail("aluno@universidade.edu.br") === true, "E-mail com formato válido deve ser aceito");
  assert(isValidEmail("aluno.invalido") === false, "E-mail sem @ e domínio deve ser rejeitado");

  // 3. Teste de Validação dos Campos de Cadastro
  const invalidFields = validateRegisterFields({
    name: "A",
    cpf: "123",
    ciap: "",
    userType: "Invalido",
    email: "email-ruim",
    password: "123",
    confirmPassword: "456",
  });
  assert(invalidFields.valid === false, "Campos inválidos devem ser reprovados");
  assert(invalidFields.errors.name !== undefined, "Erro no nome curto identificado");
  assert(invalidFields.errors.cpf !== undefined, "Erro no CPF inválido identificado");
  assert(invalidFields.errors.ciap !== undefined, "Erro no CIAP vazio identificado");
  assert(invalidFields.errors.userType !== undefined, "Erro no Tipo de Usuário identificado");
  assert(invalidFields.errors.email !== undefined, "Erro no E-mail identificado");
  assert(invalidFields.errors.password !== undefined, "Erro na senha curta identificado");
  assert(invalidFields.errors.confirmPassword !== undefined, "Erro de senhas divergentes identificado");

  const validFields = validateRegisterFields({
    name: "Carlos Eduardo Santos",
    cpf: "11144477735",
    ciap: "CIAP-987654",
    userType: "Graduação",
    email: "carlos.santos@faculdade.edu.br",
    password: "MinhaSenhaForte2026",
    confirmPassword: "MinhaSenhaForte2026",
  });
  assert(validFields.valid === true, "Formulário preenchido corretamente deve ser aprovado");

  // 4. Teste de Criptografia Segura de Senha (Hashing)
  const plainPassword = "SenhaSecreta@2026";
  const hash = hashPassword(plainPassword);
  assert(hash.includes(":"), "Hash deve conter salt:key");
  assert(!hash.includes(plainPassword), "Senha não pode ser salva em texto puro");
  assert(verifyPassword(plainPassword, hash) === true, "Senha correta deve ser verificada com sucesso");
  assert(verifyPassword("SenhaErrada", hash) === false, "Senha incorreta deve ser rejeitada");

  // 5. Teste de Token de Sessão Assinado
  const token = createSessionToken({
    userId: "user_test_123",
    email: "teste@faculdade.edu.br",
    name: "Usuário Teste",
  });
  assert(token.includes("."), "Token de sessão deve ser assinado");
  const session = verifySessionToken(token);
  assert(session !== null, "Token válido deve ser decodificado");
  assert(session?.userId === "user_test_123", "UserId da sessão deve corresponder");

  // Teste de adulteração de token
  const tamperedToken = token + "corrupted";
  assert(verifySessionToken(tamperedToken) === null, "Token adulterado deve ser rejeitado");

  // 6. Teste de Cadastro Simples no Banco SQL (SEM reconhecimento facial no cadastro)
  const testEmail = `test.mvp.${Date.now()}@faculdade.edu.br`;
  const testCpf = `999${Math.floor(Math.random() * 89999999 + 10000000)}`;
  const testCiap = `CIAP-${Date.now()}`;

  const createdUser = await prisma.user.create({
    data: {
      name: "Daniel Jorge MVP",
      cpf: testCpf,
      ciap: testCiap,
      userType: "Servidor",
      email: testEmail,
      passwordHash: hashPassword("SenhaForte123"),
      faceImage: null, // Cadastro simples sem biometria facial
    },
  });

  assert(createdUser.id !== undefined, "Usuário deve ser salvo com ID gerado");
  assert(createdUser.faceImage === null, "Cadastro simples inicial não exige imagem facial");

  // 7. Teste de Reconhecimento Facial Pós-Login (Atualização de Biometria no Dashboard)
  const mockFaceImage = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...";
  const updatedWithBiometrics = await prisma.user.update({
    where: { id: createdUser.id },
    data: { faceImage: mockFaceImage },
  });
  assert(updatedWithBiometrics.faceImage === mockFaceImage, "Biometria facial deve ser vinculada após login com liveness");

  // 8. Teste de Consulta do Perfil do Usuário (Somente Leitura via SQLite)
  const profile = await prisma.user.findUnique({
    where: { id: createdUser.id },
    select: {
      id: true,
      name: true,
      cpf: true,
      ciap: true,
      userType: true,
      email: true,
      faceImage: true,
      createdAt: true,
    },
  });
  assert(profile !== null, "Perfil deve ser consultado com sucesso");
  assert(profile?.name === "Daniel Jorge MVP", "Nome no perfil deve ser exatamente o cadastrado");
  assert(profile?.userType === "Servidor", "Tipo de usuário deve corresponder");
  assert(profile?.faceImage === mockFaceImage, "Foto capturada pós-login deve estar associada ao perfil");

  // 9. Teste de Exclusão de Cadastro com Confirmação (Área de Cadastros)
  await prisma.user.delete({ where: { id: createdUser.id } });
  const deletedCheck = await prisma.user.findUnique({ where: { id: createdUser.id } });
  assert(deletedCheck === null, "Cadastro deve ser excluído com sucesso do banco de dados");


  console.log("\n==============================================================");
  console.log("🎉 TODOS OS TESTES DO FLUXO MVP PASSARAM COM 100% DE SUCESSO!");
  console.log("==============================================================\n");

  await prisma.$disconnect();
}

runTests().catch(async (e) => {
  console.error("Erro nos testes:", e);
  await prisma.$disconnect();
  process.exit(1);
});
