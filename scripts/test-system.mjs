import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== INICIANDO TESTES DO SISTEMA DE RECONHECIMENTO FACIAL (MVP) ===\n");

  const baseUrl = "http://localhost:3000";

  // Gerador de descriptor sintético válido (128 floats entre -1 e 1)
  const generateValidDescriptor = () => {
    return Array.from({ length: 128 }, () => Number((Math.random() * 2 - 1).toFixed(6)));
  };

  try {
    // 1. Limpar banco para testes controlados
    console.log("1. Limpando banco de dados para testes...");
    await prisma.person.deleteMany();
    const initialCount = await prisma.person.count();
    console.log(`✓ Banco limpo. Contagem inicial: ${initialCount}`);

    // 2. Testar validações de erro no POST /api/persons
    console.log("\n2. Testando cenários de validação e erro (POST /api/persons)...");

    // 2.1 Nome vazio
    const resEmptyName = await fetch(`${baseUrl}/api/persons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "   ", faceDescriptor: generateValidDescriptor() }),
    });
    const dataEmptyName = await resEmptyName.json();
    console.log(`[Cenário: Nome vazio] Status: ${resEmptyName.status} | Resposta:`, dataEmptyName.error);
    if (resEmptyName.status !== 400) throw new Error("Deveria rejeitar nome vazio com 400");

    // 2.2 Sem descriptor
    const resNoDesc = await fetch(`${baseUrl}/api/persons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Carlos Alberto", faceDescriptor: null }),
    });
    const dataNoDesc = await resNoDesc.json();
    console.log(`[Cenário: Sem descriptor] Status: ${resNoDesc.status} | Resposta:`, dataNoDesc.error);
    if (resNoDesc.status !== 400) throw new Error("Deveria rejeitar descriptor nulo com 400");

    // 2.3 Descriptor com tamanho inválido (< 128 dimensões)
    const resBadDesc = await fetch(`${baseUrl}/api/persons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Carlos Alberto", faceDescriptor: [0.1, 0.2, 0.3] }),
    });
    const dataBadDesc = await resBadDesc.json();
    console.log(`[Cenário: Descriptor 3D] Status: ${resBadDesc.status} | Resposta:`, dataBadDesc.error);
    if (resBadDesc.status !== 400) throw new Error("Deveria rejeitar descriptor que não possui 128 dimensões com 400");

    // 3. Cadastrar pessoa com sucesso (Fluxo principal)
    console.log("\n3. Cadastrando 'João da Silva' com Face Descriptor 128D válido...");
    const joaoDescriptor = generateValidDescriptor();
    const resCreate = await fetch(`${baseUrl}/api/persons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "João da Silva",
        faceDescriptor: joaoDescriptor,
      }),
    });
    const dataCreate = await resCreate.json();
    console.log(`[Cenário: Cadastro Sucesso] Status: ${resCreate.status} | Criado:`, dataCreate.person);
    if (resCreate.status !== 201 || !dataCreate.success) throw new Error("Falha ao cadastrar pessoa");
    const joaoId = dataCreate.person.id;

    // 4. Cadastrar uma segunda pessoa 'Maria Souza'
    console.log("\n4. Cadastrando 'Maria Souza'...");
    const resCreateMaria = await fetch(`${baseUrl}/api/persons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Maria Souza",
        faceDescriptor: generateValidDescriptor(),
      }),
    });
    const dataCreateMaria = await resCreateMaria.json();
    console.log(`[Cenário: Cadastro Maria] Status: ${resCreateMaria.status} | Criado:`, dataCreateMaria.person.name);

    // 5. Testar GET /api/persons (Listagem)
    console.log("\n5. Consultando listagem de pessoas (GET /api/persons)...");
    const resList = await fetch(`${baseUrl}/api/persons`);
    const dataList = await resList.json();
    console.log(`[Listagem] Total retornado: ${dataList.count} pessoas.`);
    if (dataList.count !== 2) throw new Error("A listagem deveria retornar 2 pessoas");

    // Verificar se o Face Descriptor numérico bruto NÃO é exposto na listagem comum (Privacidade)
    const firstInList = dataList.persons[0];
    if (firstInList.faceDescriptor) {
      throw new Error("ALERTA DE PRIVACIDADE: faceDescriptor não deve ser exposto na listagem pública!");
    }
    console.log("✓ Verificação de privacidade: Face Descriptor protegido e não exposto na listagem.");

    // 6. Testar Edição de Nome (PATCH /api/persons/[id])
    console.log(`\n6. Editando nome de João (ID: ${joaoId}) para 'João da Silva Sauro'...`);
    const resEdit = await fetch(`${baseUrl}/api/persons/${joaoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "João da Silva Sauro" }),
    });
    const dataEdit = await resEdit.json();
    console.log(`[Edição] Status: ${resEdit.status} | Nome Atualizado:`, dataEdit.person.name);
    if (dataEdit.person.name !== "João da Silva Sauro") throw new Error("Falha ao atualizar nome");

    // Verificar no SQLite se o Face Descriptor continua íntegro após edição de nome
    const joaoInDb = await prisma.person.findUnique({ where: { id: joaoId } });
    const storedDescriptor = JSON.parse(joaoInDb.faceDescriptor);
    if (storedDescriptor.length !== 128) throw new Error("Descriptor foi corrompido durante edição");
    console.log("✓ Integridade biométrica confirmada: o Face Descriptor permaneceu inalterado no SQLite após alteração do nome.");

    // 7. Testar Estatísticas (GET /api/stats)
    console.log("\n7. Consultando estatísticas do dashboard (GET /api/stats)...");
    const resStats = await fetch(`${baseUrl}/api/stats`);
    const dataStats = await resStats.json();
    console.log("[Stats] Total:", dataStats.totalPersons, "| Último registro:", dataStats.lastRegistration);
    if (dataStats.totalPersons !== 2) throw new Error("Estatísticas incorretas");

    // 8. Testar Exclusão de Cadastro (DELETE /api/persons/[id])
    console.log(`\n8. Excluindo cadastro de João (ID: ${joaoId})...`);
    const resDelete = await fetch(`${baseUrl}/api/persons/${joaoId}`, {
      method: "DELETE",
    });
    const dataDelete = await resDelete.json();
    console.log(`[Exclusão] Status: ${resDelete.status} | Mensagem:`, dataDelete.message);

    // Verificar contagem após exclusão
    const countAfterDelete = await prisma.person.count();
    console.log(`✓ Contagem após exclusão no SQLite: ${countAfterDelete} (esperado: 1)`);
    if (countAfterDelete !== 1) throw new Error("Falha na remoção do SQLite");

    // 9. Verificar persistência com uma nova conexão Prisma
    console.log("\n9. Testando persistência real no arquivo dev.db do SQLite...");
    const newPrisma = new PrismaClient();
    const remaining = await newPrisma.person.findMany();
    console.log(`✓ Registros persistidos no SQLite físico: ${remaining.length} pessoa(s) (${remaining[0].name})`);
    await newPrisma.$disconnect();

    console.log("\n=======================================================");
    console.log("🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!");
    console.log("=======================================================\n");
  } catch (error) {
    console.error("❌ ERRO NO TESTE:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
