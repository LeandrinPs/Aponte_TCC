// Teste de contrato do JavaScript. Usa um substituto explícito do SDK, não valida a API Google real.
const { chromium, expect } = require("playwright/test");
if (process.env.APONTE_E2E_BANCO_ISOLADO !== "SIM")
  throw new Error("Use somente banco isolado: APONTE_E2E_BANCO_ISOLADO=SIM");
if (!process.env.APONTE_E2E_ADMIN_LOGIN || !process.env.APONTE_E2E_ADMIN_SENHA)
  throw new Error("Informe as credenciais administrativas do ambiente isolado");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext();
  const fixture = {
    id: "Place-Simulacao-" + Date.now(),
    nome: "Google simulado para teste",
    proprio: "Próprio do teste de mapa " + Date.now(),
  };
  await context.addInitScript((f) => {
    window.__marcadores = [];
    window.__tipos = [];
    window.__fotos = 0;
    class LatLng {
      constructor(p) {
        this.p = p;
      }
      lat() {
        return this.p.lat;
      }
      lng() {
        return this.p.lng;
      }
    }
    class Mapa {
      constructor(n, o) {
        this.center = new LatLng(o.center);
        this.controls = { TOP_CENTER: [] };
        this.listeners = {};
        n.textContent = "Mapa simulado para teste automatizado";
      }
      addListener(n, f) {
        this.listeners[n] = f;
      }
      panTo(p) {
        this.center = typeof p.lat === "function" ? p : new LatLng(p);
      }
      setCenter(p) {
        this.panTo(p);
      }
      setZoom() {}
      getCenter() {
        return this.center;
      }
      getBounds() {
        return {};
      }
    }
    class Marcador {
      constructor(o) {
        Object.assign(this, o);
        this.listeners = {};
        window.__marcadores.push(this);
      }
      append(n) {
        this.content = n;
      }
      replaceChildren(n) {
        this.content = n;
      }
      addEventListener(n, f) {
        this.listeners[n] = f;
      }
    }
    class Autocomplete extends HTMLElement {
      constructor() {
        super();
      }
    }
    customElements.define("aponte-autocomplete-teste", Autocomplete);
    class Place {
      constructor(o) {
        this.id = o.id;
        this.displayName = o.nome || f.nome;
        this.primaryType = "pizza_restaurant";
        this.location = new LatLng({ lat: -20.2839, lng: -50.2464 });
      }
      async fetchFields(o) {
        if (o.fields.includes("photos")) window.__fotos++;
        this.formattedAddress = "Endereço efêmero do teste";
        this.rating = 4.2;
        this.userRatingCount = 123;
        this.types = ["pizza_restaurant"];
        this.photos = [
          "/img/lasai.jpg",
          "/img/Asador.jpg",
          "/img/maido.jpeg",
        ].map((url, i) => ({
          getURI: () => url,
          authorAttributions: [
            {
              displayName: "Autor de teste " + (i + 1),
              uri: "https://example.test",
            },
          ],
        }));
      }
      static async searchNearby(o) {
        window.__tipos.push(o.includedTypes[0]);
        return {
          places: [
            new Place({ id: f.id }),
            new Place({ id: "Place-Duplicado-Visual", nome: f.proprio }),
          ],
        };
      }
    }
    window.google = {
      maps: {
        Map: Mapa,
        ControlPosition: { TOP_CENTER: "TOP_CENTER" },
        importLibrary: async (n) =>
          n === "marker"
            ? { AdvancedMarkerElement: Marcador }
            : {
                Place,
                PlaceAutocompleteElement: Autocomplete,
                SearchNearbyRankPreference: { DISTANCE: "DISTANCE" },
              },
      },
    };
  }, fixture);
  // Evita uma chamada externa durante o teste que usa explicitamente o SDK substituto.
  await context.route("https://maps.googleapis.com/**", (r) => r.abort());
  const page = await context.newPage(),
    base = process.env.BASE_URL || "http://127.0.0.1:8080";
  const ir = (p) => page.goto(base + p, { waitUntil: "domcontentloaded" });
  const login = async (usuario, senha) => {
    await ir("/entra.html");
    await page.locator("#email").fill(usuario);
    await page.locator("#password").fill(senha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((u) => u.pathname != "/entra.html");
  };
  let local, usuario;
  const email = "mapa-" + Date.now() + "@teste.test",
    senha = "SenhaMapaTeste123!";
  try {
    await login(
      process.env.APONTE_E2E_ADMIN_LOGIN,
      process.env.APONTE_E2E_ADMIN_SENHA,
    );
    local = await page.evaluate(
      async (nome) =>
        Aponte.api("/api/admin/estabelecimentos", {
          method: "POST",
          body: {
            nome,
            descricao: "Fixture de teste",
            rua: "Rua Teste",
            numero: "1",
            bairro: "Centro",
            cidade: "Cidade",
            estado: "SP",
            cep: "00000-000",
            latitude: "-20.2839",
            longitude: "-50.2464",
            categoria: "pizzarias",
            tags: ["brasileira"],
            icone: "cafeterias",
          },
        }),
      fixture.proprio,
    );
    usuario = await page.evaluate(
      async (dados) =>
        Aponte.api("/api/usuarios", { method: "POST", body: dados }),
      { nome: "Usuário mapa", email, senha, confirmacaoSenha: senha },
    );
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await page.waitForURL("**/index.html?saiu");
    await login(email, senha);
    await ir("/map.html?categoria=pizzarias");
    await page.waitForFunction(
      () =>
        window.initMap &&
        document.querySelector("#lista-resultados [data-resultado]"),
    );
    await page.evaluate(() => window.initMap());
    expect(
      await page.evaluate(
        (nome) =>
          window.__marcadores.filter((m) => m.map && m.title === nome).length,
        fixture.proprio,
      ),
    ).toBe(1);
    expect(
      await page.evaluate(
        () =>
          window.__marcadores.filter(
            (m) => m.map && m.title === "Google simulado para teste",
          ).length,
      ),
    ).toBe(1);
    expect(
      await page.evaluate(
        () => window.__marcadores.filter((m) => m.map).length,
      ),
    ).toBe((await page.evaluate(() => propriosVisiveis().length)) + 1);
    await page.evaluate(() =>
      window.buscarRestaurantes({ lat: -20.2839, lng: -50.2464 }),
    );
    expect(
      await page.evaluate(
        (nome) =>
          window.__marcadores.filter((m) => m.map && m.title === nome).length,
        fixture.proprio,
      ),
    ).toBe(1);
    expect(
      await page.evaluate(() =>
        window.__tipos.every((t) => t === "pizza_restaurant"),
      ),
    ).toBe(true);
    await page.evaluate(
      (nome) =>
        window.__marcadores
          .filter((m) => m.map && m.title === nome)[0]
          .listeners["gmp-click"](),
      fixture.nome,
    );
    await expect(page.locator("#nome-restaurante")).toHaveText(fixture.nome);
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      "/img/lasai.jpg",
    );
    await expect(page.locator("#creditos-foto")).toContainText(
      "Autor de teste",
    );
    await expect(page.locator("#tipo-restaurante")).toHaveText("Pizzaria");
    expect(await page.locator("#cards-proprios").count()).toBe(0);
    expect(
      await page.evaluate(
        () =>
          window.__marcadores.find(
            (m) => m.title === "Google simulado para teste",
          ).content.textContent,
      ),
    ).toBe("🍕");
    await page.locator("[data-proxima]").click();
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      "/img/Asador.jpg",
    );
    await expect(page.locator("#creditos-foto")).toContainText(
      "Autor de teste 2",
    );
    await page.locator("[data-proxima]").click();
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      "/img/maido.jpeg",
    );
    await expect(page.locator("#creditos-foto")).toContainText(
      "Autor de teste 3",
    );
    await page.locator("[data-anterior]").click();
    await page.locator("[data-anterior]").click();
    await page.locator("#favoritar").click();
    await expect(page.locator("#favoritar")).toHaveText(
      "Remover dos favoritos",
    );
    await page.locator("#nota").selectOption("4");
    await page
      .locator("#comentario")
      .fill("Aponte separado da nota pública do Google");
    await page.locator("#avaliacao-form button[type=submit]").click();
    await expect(page.locator("#media-aponte")).toHaveText("4,0");
    await expect(page.locator("#media-google")).toHaveText("4,2");
    const ref = await page.evaluate(
      async (id) =>
        Aponte.api(
          "/api/estabelecimentos/google?googlePlaceId=" +
            encodeURIComponent(id),
        ),
      fixture.id,
    );
    expect(ref.googlePlaceId).toBe(fixture.id);
    expect(ref.dadosProprios).toBeNull();
    expect(ref.fotoUrl).toBe("/img/imagem.jpeg");
    expect(
      await page.locator("#rota-restaurante").getAttribute("href"),
    ).toContain("destination_place_id=" + fixture.id);
    expect(await page.evaluate(() => window.__fotos)).toBeGreaterThan(0);
    expect(
      await page.evaluate(
        (nome) =>
          window.__marcadores.find((m) => m.map && m.title === nome).content
            .textContent,
        fixture.proprio,
      ),
    ).toBe("☕");
    await page.evaluate(() =>
      Aponte.galeria(
        document.getElementById("area-foto"),
        [
          {
            getURI: () => "/img/lasai.jpg",
            authorAttributions: [{ displayName: "Autor único" }],
          },
        ],
        true,
      ),
    );
    await expect(page.locator("[data-proxima]")).toBeHidden();
    await expect(page.locator("[data-anterior]")).toBeHidden();
    await expect(page.locator("#creditos-foto")).toContainText("Autor único");
    await page.evaluate(() =>
      Aponte.galeria(document.getElementById("area-foto"), [], false),
    );
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      "/img/imagem.jpeg",
    );
    await expect(page.locator("[data-proxima]")).toBeHidden();
    await ir("/favoritos.html");
    await expect(page.locator("#lista-favoritos")).toContainText(fixture.nome);
    await expect(page.locator("#lista-favoritos .creditos")).toContainText(
      "Autor de teste",
    );
    console.log(
      "Mapa híbrido: marcadores próprios preservados, filtro Places, deduplicação visual, fotografias/atribuições, favoritos e avaliações via Place ID: OK com SDK simulado.",
    );
  } finally {
    if (usuario || local) {
      try {
        await login(
          process.env.APONTE_E2E_ADMIN_LOGIN,
          process.env.APONTE_E2E_ADMIN_SENHA,
        );
        await page.evaluate(
          async ({ usuario, local }) => {
            if (usuario)
              await Aponte.api("/api/admin/usuarios/" + usuario.id, {
                method: "DELETE",
              });
            if (local)
              await Aponte.api("/api/admin/estabelecimentos/" + local.id, {
                method: "DELETE",
              });
          },
          { usuario, local },
        );
      } catch (e) {
        console.log("A limpeza das fixtures não terminou:", e.message);
      }
    }
    await browser.close();
  }
})();
