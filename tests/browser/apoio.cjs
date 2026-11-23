const { chromium, expect } = require("playwright/test");
const fs = require("fs"),
  path = require("path");
async function iniciar() {
  if (process.env.APONTE_E2E_BANCO_ISOLADO !== "SIM")
    throw new Error(
      "Use somente um banco isolado: APONTE_E2E_BANCO_ISOLADO=SIM",
    );
  if (
    !process.env.APONTE_E2E_ADMIN_LOGIN ||
    !process.env.APONTE_E2E_ADMIN_SENHA
  )
    throw new Error("Informe as credenciais administrativas de teste");
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage(),
    base = process.env.BASE_URL || "http://127.0.0.1:8080";
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("dialog", (d) => d.accept());
  const ir = (p) => page.goto(base + p, { waitUntil: "domcontentloaded" });
  const api = async (url, method = "GET", body) => {
    const r = await page.evaluate(
      async (a) => {
        try {
          return {
            dados: await Aponte.api(a.url, {
              method: a.method,
              ...(a.body ? { body: a.body } : {}),
            }),
          };
        } catch (e) {
          return { erro: e.message, status: e.status };
        }
      },
      { url, method, body },
    );
    if (r.erro) {
      const e = new Error(r.erro);
      e.status = r.status;
      throw e;
    }
    return r.dados;
  };
  const login = async (
    user = process.env.APONTE_E2E_ADMIN_LOGIN,
    senha = process.env.APONTE_E2E_ADMIN_SENHA,
  ) => {
    await ir("/entra.html");
    await page.locator("#email").fill(user);
    await page.locator("#password").fill(senha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((u) => u.pathname != "/entra.html");
  };
  const proprio = (nome, extra = {}) =>
    api("/api/admin/estabelecimentos", "POST", {
      nome,
      descricao: "Fixture isolada da exploração",
      rua: "Rua Teste",
      numero: "1",
      bairro: "Centro",
      cidade: "Ouroeste",
      estado: "SP",
      cep: "00000-000",
      latitude: "-20.2839",
      longitude: "-50.2434",
      categoria: "pizzarias",
      tags: [],
      icone: "auto",
      ...extra,
    });
  const senha = "SenhaFixture123!";
  const usuario = (nome) =>
    api("/api/usuarios", "POST", {
      nome,
      email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@teste.test`,
      senha,
      confirmacaoSenha: senha,
    });
  const artefatos = path.join(__dirname, "artifacts");
  fs.mkdirSync(artefatos, { recursive: true });
  const captura = (nome) =>
    page.screenshot({ path: path.join(artefatos, nome), fullPage: true });
  return {
    browser,
    context,
    page,
    base,
    ir,
    api,
    login,
    proprio,
    usuario,
    senha,
    erros,
    captura,
    expect,
  };
}
module.exports = { iniciar };
