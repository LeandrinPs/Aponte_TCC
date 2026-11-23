const { chromium, expect } = require("playwright/test");
const fs = require("fs");
const path = require("path");
if (process.env.APONTE_E2E_BANCO_ISOLADO !== "SIM")
  throw new Error(
    "Execute somente em um banco isolado; defina APONTE_E2E_BANCO_ISOLADO=SIM",
  );
if (!process.env.APONTE_E2E_ADMIN_LOGIN || !process.env.APONTE_E2E_ADMIN_SENHA)
  throw new Error("Informe as credenciais administrativas do ambiente isolado");
const artefatos = path.join(__dirname, "artifacts");
fs.mkdirSync(artefatos, { recursive: true });
const imagem = (n) =>
  path.join(__dirname, "../../src/main/resources/static/img", n);
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("dialog", (d) => d.accept());
  const base = process.env.BASE_URL || "http://127.0.0.1:8080";
  const email = `browser-${Date.now()}@teste.test`,
    senha = "SenhaBrowser123!";
  const adminSenha = process.env.APONTE_E2E_ADMIN_SENHA;
  const ir = async (p) =>
    page.goto(base + p, { waitUntil: "domcontentloaded" });
  const sair = async () => {
    if (await page.locator(".conta-toggle").count())
      await page.locator(".conta-toggle").click();
    await page.getByRole("button", { name: "Sair", exact: true }).click();
  };
  const log = (m) => console.log(m);
  try {
    await ir("/index.html");
    await expect(
      page.getByRole("heading", {
        name: "Novos sabores. Boas descobertas.",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(artefatos, "aponte-inicio-estilizado.png"),
      fullPage: true,
    });
    log("Início e recursos estáticos OK");
    await ir("/entra.html");
    await page.locator("#email").fill(process.env.APONTE_E2E_ADMIN_LOGIN);
    await page.locator("#password").fill(adminSenha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/admin");
    await expect(page.locator("#indicadores .indicador")).toHaveCount(6);
    log("Login administrativo e indicadores OK");
    await ir("/admin/estabelecimentos/novo");
    const dados = {
      nome: "Restaurante Navegador " + Date.now(),
      descricao: "Cadastro de teste com fotografia própria",
      rua: "Rua dos Sabores",
      numero: "10",
      bairro: "Centro",
      cidade: "Fernandópolis",
      estado: "SP",
      cep: "15600-000",
      latitude: "-20.2839",
      longitude: "-50.2464",
    };
    for (const [k, v] of Object.entries(dados))
      await page.locator("#" + k).fill(v);
    await page.locator("#adicionar-fotografias").check();
    await page.locator("#foto").setInputFiles(imagem("Asador.jpg"));
    await page.getByRole("button", { name: "Salvar estabelecimento" }).click();
    await page.waitForURL("**/admin/estabelecimentos?id=*");
    const id = new URL(page.url()).searchParams.get("id");
    await expect(page.locator("#manutencao-titulo")).toHaveText(dados.nome);
    log("Cadastro próprio com fotografia OK, ID " + id);
    await page
      .locator("#item-form input[name=nome]")
      .fill("Prato do navegador");
    await page
      .locator("#item-form input[name=descricao]")
      .fill("Arroz, feijão e legumes");
    await page.locator("#item-form input[name=preco]").fill("18.90");
    await page
      .getByRole("button", { name: "Salvar item", exact: true })
      .click();
    await expect(page.locator("#admin-cardapios")).toContainText(
      "Prato do navegador",
    );
    log("Manutenção de cardápio OK");
    await sair();
    await page.waitForURL("**/index.html?saiu");
    await ir("/forma.html");
    await page.locator("#nome").fill("Usuária Navegador");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(senha);
    await page.locator("#confirmacao-senha").fill(senha);
    await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
    await page.waitForURL("**/entra.html?cadastrado");
    log("Cadastro de usuário OK");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(senha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/map.html");
    await ir("/map.html?id=" + id);
    await expect(page.locator("#nome-restaurante")).toHaveText(dados.nome);
    await expect(page.locator("#avaliacao-form")).toBeVisible();
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      /\/imagens\//,
    );
    await page.locator("#pills-profile-tab").click();
    await expect(page.locator("#itens-cardapio")).toContainText(
      "Prato do navegador",
    );
    log("Consulta pública: estabelecimento, fotografia e cardápio OK");
    await page.locator("#favoritar").click();
    await expect(page.locator("#favoritar")).toHaveText(
      "Remover dos favoritos",
    );
    await page.locator("#nota").selectOption("4");
    await page
      .locator("#comentario")
      .fill("Muito bom <script>window.injecao=true</script>");
    await page.locator("#avaliacao-form button[type=submit]").click();
    await expect(page.locator("#media-aponte")).toHaveText("4,0");
    await expect(page.locator("#lista-avaliacoes")).toContainText("<script>");
    expect(await page.evaluate(() => window.injecao)).toBeUndefined();
    await page.locator("#nota").selectOption("5");
    await page.locator("#comentario").fill("Avaliação editada pelo autor");
    await page.locator("#avaliacao-form button[type=submit]").click();
    await expect(page.locator("#media-aponte")).toHaveText("5,0");
    log("Favorito, avaliação, edição e renderização segura OK");
    await page.screenshot({
      path: path.join(artefatos, "aponte-painel-proprio.png"),
      fullPage: true,
    });
    await ir("/favoritos.html");
    await expect(page.locator("#lista-favoritos")).toContainText(dados.nome);
    await sair();
    await page.waitForURL("**/index.html?saiu");
    await ir("/entra.html");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(senha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/map.html");
    await ir("/favoritos.html");
    await expect(page.locator("#lista-favoritos")).toContainText(dados.nome);
    log("Favorito preservado após logout e novo login OK");
    const proibido = await page.request.get(base + "/api/admin/resumo");
    expect(proibido.status()).toBe(403);
    const paginaProibida = await ir("/admin");
    expect(paginaProibida.status()).toBe(403);
    await expect(
      page.getByRole("heading", { name: "Acesso restrito", exact: true }),
    ).toBeVisible();
    await ir("/favoritos.html");
    await page
      .getByRole("button", { name: "Remover favorito", exact: true })
      .click();
    await expect(page.locator("#favoritos-status")).toContainText(
      "ainda não tem favoritos",
    );
    log("Autorização e remoção de favorito OK");
    await sair();
    await page.waitForURL("**/index.html?saiu");
    await ir("/entra.html");
    await page.locator("#email").fill(process.env.APONTE_E2E_ADMIN_LOGIN);
    await page.locator("#password").fill(adminSenha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL("**/admin");
    await ir("/admin/estabelecimentos?id=" + id);
    await expect(page.locator("#admin-avaliacoes")).toContainText(
      "Avaliação editada pelo autor",
    );
    await page
      .getByRole("button", { name: "Remover avaliação", exact: true })
      .click();
    await expect(page.locator("#admin-avaliacoes")).toContainText(
      "Nenhuma avaliação",
    );
    await ir("/admin/estabelecimentos/" + id);
    await expect(page.locator("#remover-foto")).toBeVisible();
    await page
      .locator("#descricao")
      .fill("Descrição atualizada pela administração");
    const fotoAntiga = await page.locator("#foto-preview").getAttribute("src");
    await page.locator("#foto").setInputFiles(imagem("lasai.jpg"));
    await page.getByRole("button", { name: "Salvar estabelecimento" }).click();
    await page.waitForURL("**/admin/estabelecimentos?id=" + id);
    expect((await page.request.get(base + fotoAntiga)).status()).toBe(404);
    log("Substituição de fotografia remove arquivo antigo após commit OK");
    await ir("/admin/estabelecimentos/" + id);
    await expect(page.locator("#remover-foto")).toBeVisible();
    await page.locator("#remover-foto").click();
    await expect(page.locator("#remover-foto")).toBeHidden();
    await expect(page.locator("#foto-preview")).toHaveAttribute(
      "src",
      "/img/ilustrativas/restaurantes.svg",
    );
    log("Moderação e remoção de fotografia OK");
    await ir("/admin/usuarios");
    const linhaUsuario = page
      .locator("#tabela-usuarios tr")
      .filter({ hasText: email });
    await linhaUsuario
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    await page
      .locator("#editar-usuario input[name=nome]")
      .fill("Nome atualizado pela administração");
    await page.locator("#editar-usuario button").click();
    await expect(linhaUsuario).toContainText(
      "Nome atualizado pela administração",
    );
    log("Edição administrativa de usuário OK");
    await linhaUsuario
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(linhaUsuario).toHaveCount(0, { timeout: 12000 });
    log("Exclusão administrativa de usuário pela interface OK");
    await page.screenshot({
      path: path.join(artefatos, "aponte-admin.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await ir("/admin");
    await expect(page.locator("#indicadores .indicador")).toHaveCount(6);
    await page.screenshot({
      path: path.join(artefatos, "aponte-mobile.png"),
      fullPage: true,
    });
    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            document.querySelector("main h1").getBoundingClientRect().top -
            document.querySelector(".admin-sidebar").getBoundingClientRect()
              .bottom,
        ),
      )
      .toBeGreaterThanOrEqual(0);
    const dimensoes = await page.evaluate(() => ({
      largura: innerWidth,
      conteudo: document.documentElement.scrollWidth,
    }));
    expect(dimensoes.conteudo).toBeLessThanOrEqual(dimensoes.largura + 1);
    fs.writeFileSync(
      path.join(artefatos, "browser-resultado.json"),
      JSON.stringify(
        { email, estabelecimentoId: id, erros, dimensoes, resultado: "passou" },
        null,
        2,
      ),
    );
    expect(erros).toEqual([]);
    log("Fluxos de navegador e viewport móvel passaram.");
    const limpeza = await page.evaluate(
      async ({ email, id }) => {
        const lista = await Aponte.api("/api/admin/usuarios");
        const u = lista.find((u) => u.email === email);
        if (u)
          await Aponte.api("/api/admin/usuarios/" + u.id, { method: "DELETE" });
        for (const item of await Aponte.api("/api/cardapios?id=" + id))
          await Aponte.api("/api/admin/cardapios/" + item.id, {
            method: "DELETE",
          });
        await Aponte.api("/api/admin/estabelecimentos/" + id, {
          method: "DELETE",
        });
        return true;
      },
      { email, id },
    );
    expect(limpeza).toBe(true);
    log("Limpeza dos registros criados por este teste OK");
  } catch (e) {
    await page.screenshot({
      path: path.join(artefatos, "aponte-falha.png"),
      fullPage: true,
    });
    console.log("URL da falha:", page.url());
    console.log(
      "Mensagens:",
      await page.locator("[role=status]").allTextContents(),
    );
    throw e;
  } finally {
    await browser.close();
  }
})();
