// Fluxos reais do Spring/MySQL e da interface. O SDK Google não é substituído neste arquivo.
const { chromium, expect } = require("playwright/test");
const fs = require("fs"),
  path = require("path");
if (process.env.APONTE_E2E_BANCO_ISOLADO !== "SIM")
  throw new Error("Use um banco isolado: APONTE_E2E_BANCO_ISOLADO=SIM");
if (!process.env.APONTE_E2E_ADMIN_LOGIN || !process.env.APONTE_E2E_ADMIN_SENHA)
  throw new Error("Configure as credenciais do administrador de teste");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  const base = process.env.BASE_URL || "http://127.0.0.1:8080",
    art = path.join(__dirname, "artifacts");
  fs.mkdirSync(art, { recursive: true });
  const foto = (n) =>
      path.join(__dirname, "../../src/main/resources/static/img", n),
    ir = (p) => page.goto(base + p, { waitUntil: "domcontentloaded" });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("dialog", (d) => d.accept());
  const api = (url, method = "GET", body) =>
    page.evaluate(
      async (a) =>
        Aponte.api(a.url, {
          method: a.method,
          ...(a.body ? { body: a.body } : {}),
        }),
      { url, method, body },
    );
  const login = async (user, senha) => {
    await ir("/entra.html");
    await page.locator("#email").fill(user);
    await page.locator("#password").fill(senha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((u) => u.pathname != "/entra.html");
  };
  const sair = async () => {
    if (await page.locator(".conta-toggle").count())
      await page.locator(".conta-toggle").click();
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await page.waitForURL("**/index.html?saiu");
  };
  let id, usuario;
  const email = `moderno-${Date.now()}@teste.test`,
    senha = "SenhaModerno123!",
    nome = `Pizzaria Moderna ${Date.now()}`;
  try {
    await ir("/index.html");
    await expect(page.locator(".categorias-nav>a")).toHaveCount(5);
    await page.getByRole("button", { name: "Mais", exact: true }).click();
    await expect(
      page.locator('a[href="/map.html?categoria=brasileira"]'),
    ).toBeVisible();
    await ir("/forma.html");
    await page.locator("#nome").fill("Pessoa Moderna");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(senha);
    await page.locator("#confirmacao-senha").fill("diferente");
    expect(
      await page
        .locator("#confirmacao-senha")
        .evaluate((n) => n.checkValidity()),
    ).toBe(false);
    await page.locator("#confirmacao-senha").fill(senha);
    await page.getByRole("button", { name: "Cadastrar", exact: true }).click();
    await page.waitForURL("**/entra.html?cadastrado");
    await page.screenshot({
      path: path.join(art, "moderno-login.png"),
      fullPage: true,
    });
    await login(
      process.env.APONTE_E2E_ADMIN_LOGIN,
      process.env.APONTE_E2E_ADMIN_SENHA,
    );
    await expect(page.locator("#indicadores .indicador")).toHaveCount(6);
    await expect(page.locator("#distribuicao")).not.toBeEmpty();
    for (const route of [
      "/admin/avaliacoes",
      "/admin/cardapios",
      "/admin/usuarios",
    ]) {
      const res = await ir(route);
      expect(res.status()).toBe(200);
    }
    await ir("/admin/estabelecimentos/novo");
    const dados = {
      nome,
      descricao: "Cadastro próprio com galeria e classificação",
      rua: "Rua das Flores",
      numero: "12",
      bairro: "Centro",
      cidade: "Ouroeste",
      estado: "SP",
      cep: "15685-000",
      latitude: "-20.2839",
      longitude: "-50.2464",
    };
    for (const [k, v] of Object.entries(dados))
      await page.locator("#" + k).fill(v);
    await page.locator("#categoria").selectOption("pizzarias");
    await page.locator("[name=tag][value=brasileira]").check();
    await page.locator("#icone").selectOption("cafeterias");
    await expect(page.locator("#icone-preview")).toHaveText("☕");
    await page.locator("#icone").selectOption("auto");
    await expect(page.locator("#icone-preview")).toHaveText("🍕");
    await page.locator("#adicionar-fotografias").check();
    for (const [sel, n] of [
      ["#foto", "Asador.jpg"],
      ["#foto-2", "lasai.jpg"],
      ["#foto-3", "maido.jpeg"],
    ])
      await page.locator(sel).setInputFiles(foto(n));
    await expect(page.locator("#foto-preview-2")).toHaveAttribute(
      "src",
      /^blob:/,
    );
    await page
      .getByRole("button", { name: "Salvar estabelecimento", exact: true })
      .click();
    await page.waitForURL("**/admin/estabelecimentos?id=*");
    id = Number(new URL(page.url()).searchParams.get("id"));
    let est = await api("/api/estabelecimentos/" + id);
    expect(est.fotos.filter(Boolean)).toHaveLength(3);
    expect(est.dadosProprios.categoria).toBe("pizzarias");
    expect(est.dadosProprios.tags).toContain("brasileira");
    const originais = [...est.fotos];
    await ir("/admin/estabelecimentos/" + id);
    await expect(page.locator("#principal-2")).toBeVisible();
    await page.locator("#principal-2").click();
    await expect(page.locator("#foto-preview")).toHaveAttribute(
      "src",
      originais[1],
    );
    await page.locator("#remover-foto-3").click();
    await expect(page.locator("#remover-foto-3")).toBeHidden();
    expect((await page.request.get(base + originais[2])).status()).toBe(404);
    await page.locator("#foto-3").setInputFiles(foto("Asador.jpg"));
    await page
      .getByRole("button", { name: "Salvar estabelecimento", exact: true })
      .click();
    await page.waitForURL("**/admin/estabelecimentos?id=" + id);
    await ir("/admin/estabelecimentos/" + id);
    await expect(page.locator("#foto-preview-2")).toHaveAttribute(
      "src",
      /^\/imagens\//,
    );
    const antiga2 = await page.locator("#foto-preview-2").getAttribute("src");
    await page.locator("#foto-2").setInputFiles(foto("maido.jpeg"));
    await page
      .getByRole("button", { name: "Salvar estabelecimento", exact: true })
      .click();
    await page.waitForURL("**/admin/estabelecimentos?id=" + id);
    expect((await page.request.get(base + antiga2)).status()).toBe(404);
    console.log(
      "Galeria: três uploads, prévia, categoria/tags/ícone, troca de principal, remoção e substituição individuais passaram.",
    );
    await sair();
    await login(email, senha);
    usuario = (await api("/api/me")).id;
    await page.locator(".conta-toggle").click();
    for (const t of [
      "Meu perfil",
      "Meus favoritos",
      "Minhas avaliações",
      "Configurações",
    ])
      await expect(
        page.getByRole("link", { name: t, exact: true }),
      ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Painel administrativo", exact: true }),
    ).toHaveCount(0);
    await ir("/map.html?categoria=pizzarias");
    await expect(page.locator("#lista-resultados")).toContainText(nome);
    await ir("/map.html?categoria=cafeterias");
    await expect(page.locator("#lista-resultados")).not.toContainText(nome);
    await ir("/map.html?categoria=brasileira");
    await expect(page.locator("#lista-resultados")).toContainText(nome);
    await page
      .locator('[data-resultado="aponte:' + id + '"] .resultado-abrir')
      .click();
    await expect(page.locator("#painel-restaurante")).toHaveClass(/aberto/);
    await expect(page.locator("#tipo-restaurante")).toHaveText("Pizzaria");
    await expect(page.locator("#resumo-avaliacoes")).toHaveText(
      "Ainda não avaliado no Aponte",
    );
    await expect(page.locator("#avaliacao-restaurante")).toContainText(
      "Sem vínculo",
    );
    const img1 = await page.locator("#foto-restaurante").getAttribute("src");
    await page.locator("[data-proxima]").click();
    expect(
      await page.locator("#foto-restaurante").getAttribute("src"),
    ).not.toBe(img1);
    await expect(page.locator("[data-contador]")).toHaveText("2 / 3");
    await page.locator("[data-proxima]").click();
    await expect(page.locator("[data-contador]")).toHaveText("3 / 3");
    await page.locator("[data-proxima]").click();
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      img1,
    );
    await expect
      .poll(() =>
        page
          .locator("#foto-restaurante")
          .evaluate((n) => n.complete && n.naturalWidth > 0),
      )
      .toBe(true);
    await page.locator("#favoritar").click();
    await expect(page.locator("#favoritar")).toHaveText(
      "Remover dos favoritos",
    );
    await page.locator("#nota").selectOption("5");
    await page.locator("#comentario").fill("Experiência moderna e acolhedora.");
    await page.locator("#avaliacao-form button[type=submit]").click();
    await expect(page.locator("#media-aponte")).toHaveText("5,0");
    await page.evaluate(() => {
      document.getElementById("painel-restaurante").scrollTop = 0;
      window.scrollTo(0, 0);
    });
    await page.screenshot({
      path: path.join(art, "moderno-painel.png"),
      fullPage: true,
    });
    await page.locator("#fechar-painel").click();
    await expect(page.locator("#painel-restaurante")).not.toHaveClass(/aberto/);
    await ir("/perfil.html");
    await expect(page.locator("#total-avaliacoes")).toHaveText("1");
    await expect(page.locator("#total-favoritos")).toHaveText("1");
    await expect(page.locator("#perfil-desde")).not.toContainText("Carregando");
    await page.locator("[data-aba=configuracoes]").click();
    await page.locator("#perfil-campo-nome").fill("Pessoa Atualizada");
    await page.locator("#perfil-cidade").fill("Ouroeste");
    await page.locator("#perfil-estado").fill("sp");
    await page.locator("#perfil-form button").click();
    await expect(page.locator("#perfil-local")).toHaveText("Ouroeste — SP");
    await page.locator("#foto-perfil").setInputFiles(foto("lasai.jpg"));
    await expect(page.locator("#avatar-preview")).toHaveAttribute(
      "src",
      /^blob:/,
    );
    await page.locator("#foto-perfil-form button[type=submit]").click();
    await expect(page.locator("#perfil-avatar")).toHaveAttribute(
      "src",
      /^\/imagens\//,
    );
    const avatar1 = await page.locator("#perfil-avatar").getAttribute("src");
    await page.locator("#foto-perfil").setInputFiles(foto("Asador.jpg"));
    await page.locator("#foto-perfil-form button[type=submit]").click();
    await expect(page.locator("#perfil-avatar")).not.toHaveAttribute(
      "src",
      avatar1,
    );
    expect((await page.request.get(base + avatar1)).status()).toBe(404);
    await page.locator("[data-aba=avaliacoes]").click();
    await expect(page.locator("#minhas-avaliacoes")).toContainText(
      "Experiência moderna",
    );
    await page.locator("[data-aba=favoritos]").click();
    await expect(page.locator("#lista-favoritos")).toContainText(nome);
    await page.locator("[data-aba=visao-geral]").click();
    await page.screenshot({
      path: path.join(art, "moderno-perfil.png"),
      fullPage: true,
    });
    await ir("/index.html");
    await expect(page.locator("#avaliacoes-recentes")).toContainText(
      "Pessoa Atualizada",
    );
    await expect(page.locator("#avaliacoes-recentes")).toContainText(nome);
    await expect(page.locator("#avaliacoes-recentes")).toContainText(
      "Experiência moderna",
    );
    await expect(page.locator("#avaliacoes-recentes")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    await page.screenshot({
      path: path.join(art, "moderno-feed.png"),
      fullPage: true,
    });
    console.log(
      "Perfil: dados e foto próprios, contagens, abas, favoritos e feed público com dados persistidos passaram.",
    );
    for (const rota of [
      "/index.html",
      "/perfil.html",
      "/map.html?id=" + id,
      "/entra.html",
      "/forma.html",
    ]) {
      await page.setViewportSize({ width: 390, height: 844 });
      await ir(rota);
      await page.waitForTimeout(200);
      const d = await page.evaluate(() => ({
        viewport: innerWidth,
        conteudo: document.documentElement.scrollWidth,
      }));
      expect(d.conteudo, rota).toBeLessThanOrEqual(d.viewport + 1);
      if (rota === "/entra.html")
        await page.screenshot({
          path: path.join(art, "moderno-login-mobile.png"),
          fullPage: true,
        });
      if (rota === "/perfil.html")
        await page.screenshot({
          path: path.join(art, "moderno-perfil-mobile.png"),
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await ir("/perfil.html#configuracoes");
    await expect(page.locator("#remover-avatar")).toBeVisible();
    const fotoRemovida = await page
      .locator("#perfil-avatar")
      .getAttribute("src");
    await page.locator("#remover-avatar").click();
    await expect(page.locator("#perfil-avatar")).toHaveAttribute(
      "src",
      "/img/avatar.svg",
    );
    expect((await page.request.get(base + fotoRemovida)).status()).toBe(404);
    expect(erros).toEqual([]);
    console.log(
      "Desktop/mobile: ausência de overflow, galeria e menu acessíveis, nenhum erro JavaScript; remoção do avatar passou.",
    );
    await sair();
    await login(
      process.env.APONTE_E2E_ADMIN_LOGIN,
      process.env.APONTE_E2E_ADMIN_SENHA,
    );
    await expect(page.locator("#distribuicao .barra-origem")).toBeVisible();
    await page.screenshot({
      path: path.join(art, "moderno-dashboard.png"),
      fullPage: true,
    });
  } catch (e) {
    await page.screenshot({
      path: path.join(art, "moderno-falha.png"),
      fullPage: true,
    });
    console.log("Falha na rota:", new URL(page.url()).pathname);
    console.log(
      "Estados:",
      await page.locator("[role=status]").allTextContents(),
    );
    throw e;
  } finally {
    try {
      await login(
        process.env.APONTE_E2E_ADMIN_LOGIN,
        process.env.APONTE_E2E_ADMIN_SENHA,
      );
      if (!usuario) {
        const u = (await api("/api/admin/usuarios")).find(
          (u) => u.email === email,
        );
        usuario = u?.id;
      }
      if (usuario) await api("/api/admin/usuarios/" + usuario, "DELETE");
      if (id) await api("/api/admin/estabelecimentos/" + id, "DELETE");
    } finally {
      await browser.close();
    }
  }
})();
