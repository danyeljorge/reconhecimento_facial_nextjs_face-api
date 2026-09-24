import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runRecognitionTests() {
  console.log("=== TESTANDO SISTEMA DE RECONHECIMENTO FACIAL E ROTAS ===\n");
  const baseUrl = "http://localhost:3000";

  try {
    // 1. Verificar endpoints de páginas
    const pages = ["/", "/reconhecer", "/cadastro", "/cadastros"];
    for (const p of pages) {
      const res = await fetch(`${baseUrl}${p}`);
      console.log(`Página ${p}: Status ${res.status}`);
      if (res.status !== 200) throw new Error(`Falha ao acessar ${p}`);
    }

    // 2. Cadastrar uma pessoa teste com um descriptor conhecido
    // Gerar um vetor de 128 valores fixos
    const testDescriptor = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1));

    const resCad = await fetch(`${baseUrl}/api/persons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Carlos Eduardo Reconhecido",
        faceDescriptor: testDescriptor,
      }),
    });
    const cadData = await resCad.json();
    console.log("\nCadastro para teste:", cadData.person?.name, "| ID:", cadData.person?.id);

    // 3. Testar reconhecimento com o mesmo vetor (distância = 0)
    console.log("\nTestando reconhecimento com vetor idêntico (distância ~ 0)...");
    const resRecExact = await fetch(`${baseUrl}/api/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faceDescriptor: testDescriptor }),
    });
    const dataRecExact = await resRecExact.json();
    console.log("Resultado exato:", dataRecExact);
    if (!dataRecExact.recognized || dataRecExact.person.name !== "Carlos Eduardo Reconhecido") {
      throw new Error("Deveria ter reconhecido Carlos Eduardo!");
    }

    // 4. Testar reconhecimento com pequena variação de iluminação/expressão (distância pequena < 0.3)
    console.log("\nTestando reconhecimento com pequenas variações simuladas...");
    const perturbedDescriptor = testDescriptor.map((v) => v + (Math.random() * 0.04 - 0.02));
    const resRecPerturbed = await fetch(`${baseUrl}/api/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faceDescriptor: perturbedDescriptor }),
    });
    const dataRecPerturbed = await resRecPerturbed.json();
    console.log("Resultado com ruído:", dataRecPerturbed);
    if (!dataRecPerturbed.recognized) {
      throw new Error("Deveria ter reconhecido com tolerância biométrica!");
    }

    // 5. Testar pessoa desconhecida / não cadastrada
    console.log("\nTestando com vetor aleatório (pessoa desconhecida)...");
    const unknownDescriptor = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    const resRecUnknown = await fetch(`${baseUrl}/api/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faceDescriptor: unknownDescriptor }),
    });
    const dataRecUnknown = await resRecUnknown.json();
    console.log("Resultado desconhecido:", dataRecUnknown);
    if (dataRecUnknown.recognized) {
      throw new Error("Pessoa aleatória não deveria ser reconhecida!");
    }

    // 6. Testar endpoint GET /api/recognize (carregamento de descriptors para o frontend)
    console.log("\nTestando GET /api/recognize para cache no cliente...");
    const resGetDesc = await fetch(`${baseUrl}/api/recognize`);
    const dataGetDesc = await resGetDesc.json();
    console.log(`Descriptors retornados: ${dataGetDesc.count} cadastros prontos para matching em tempo real.`);
    if (dataGetDesc.count < 1) throw new Error("Deveria retornar pelo menos 1 cadastro");

    console.log("\n=========================================================");
    console.log("🎉 RECONHECIMENTO FACIAL TOTALMENTE VALIDADO E OPERACIONAL!");
    console.log("=========================================================\n");
  } catch (error) {
    console.error("❌ ERRO:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runRecognitionTests();
