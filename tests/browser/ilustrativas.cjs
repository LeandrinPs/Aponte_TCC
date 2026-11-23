// Chamado pelo ImagensNavegadorIT: Spring real, H2 e uploads temporários.
// Somente o SDK Google é simulado. Não altera propriedades ou variáveis de ambiente.
const { chromium, expect } = require("playwright/test");
const fs = require("node:fs"),
  path = require("node:path");
const base = process.argv[2];
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base || ""))
  throw new Error(
    "Execute via ImagensNavegadorIT, com servidor de teste local isolado.",
  );
(async () => {
  const browser = await chromium.launch({
    executablePath: process.argv[3] || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await require("./sdk-exploracao.cjs")(context, {
    centro: { lat: -20.2839, lng: -50.2464 },
    duplicado: "Outro nome",
  });
  await context.addInitScript(() => {
    const importar = google.maps.importLibrary;
    google.maps.importLibrary = async (n) => {
      const lib = await importar(n);
      if (n !== "places") return lib;
      const fotografia = (i) => ({
        getURI: () =>
          ["/img/Asador.jpg", "/img/lasai.jpg", "/img/maido.jpeg"][i],
        authorAttributions: [
          {
            displayName: `Autor Google simulado ${i + 1}`,
            uri: "https://example.test/autor",
          },
        ],
      });
      class Place extends lib.Place {
        constructor(o) {
          super(o);
          this.primaryType = "pizza_restaurant";
          this.types = ["pizza_restaurant", "restaurant"];
          this.photos =
            o.id === "Google-fotos-reais"
              ? [0, 1, 2].map(fotografia)
              : o.id === "Google-foto-quebrada"
                ? [
                    {
                      ...fotografia(0),
                      getURI: () =>
                        "/imagens/00000000-0000-0000-0000-000000000000.png",
                    },
                  ]
                : [];
        }
        static async searchNearby(r) {
          const d = await lib.Place.searchNearby(r);
          d.places.forEach((p) => (p.photos = []));
          return d;
        }
        static async searchByText(r) {
          const d = await lib.Place.searchByText(r);
          d.places.forEach((p) => (p.photos = []));
          return d;
        }
      }
      return { ...lib, Place };
    };
  });
  const page = await context.newPage(),
    erros = [],
    resultados = [];
  page.on("pageerror", (e) => erros.push(e.message));
  const art = path.join(__dirname, "artifacts");
  fs.mkdirSync(art, { recursive: true });
  const ir = async (p) => {
    await page.goto(base + p, { waitUntil: "domcontentloaded" });
    if (p.startsWith("/map.html")) await page.evaluate(() => initMap());
  };
  const api = (url, method = "GET", body) =>
    page.evaluate(
      async (a) =>
        Aponte.api(a.url, {
          method: a.method,
          ...(a.body ? { body: a.body } : {}),
        }),
      { url, method, body },
    );
  const login = async (nome, senha = "SenhaIlustrativas123!") => {
    await ir("/entra.html");
    await page.locator("#email").fill(nome);
    await page.locator("#password").fill(senha);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL((u) => u.pathname !== "/entra.html");
  };
  const salvar = async (id) => {
    await page.locator("#salvar-estabelecimento").click();
    await page.waitForURL(
      id
        ? `**/admin/estabelecimentos?id=${id}`
        : "**/admin/estabelecimentos?id=*",
    );
    return Number(new URL(page.url()).searchParams.get("id"));
  };
  const editar = async (id) => {
    await ir(`/admin/estabelecimentos/${id}`);
    await expect(page.locator("#estabelecimento-form")).toHaveAttribute(
      "aria-busy",
      "false",
    );
  };
  const ilustrativa = async (img, legenda, categoria) => {
    await expect(img).toHaveAttribute(
      "src",
      `/img/ilustrativas/${categoria}.svg`,
    );
    await expect(img).toHaveAttribute("data-imagem-tipo", "ilustrativa");
    await expect(legenda).toContainText("Imagem ilustrativa");
    await expect(legenda.locator(".google-atribuicao")).toHaveCount(0);
    await expect
      .poll(() => img.evaluate((n) => n.complete && n.naturalWidth > 0))
      .toBe(true);
  };
  const painel = () => [
    page.locator("#foto-restaurante"),
    page.locator("#creditos-foto"),
  ];
  const semSetas = async () => {
    for (const s of ["[data-proxima]", "[data-anterior]", "[data-contador]"])
      await expect(page.locator(s)).toBeHidden();
  };
  const foto = (n) =>
    path.join(__dirname, "../../src/main/resources/static/img", n);
  try {
    await login("admin:ilustrativas-teste");
    await ir("/admin/estabelecimentos/novo");
    await expect(page.locator("#sem-fotografia")).toBeChecked();
    await expect(page.locator("#campos-fotografias")).toBeHidden();
    const dados = {
      nome: "Pizzaria Ilustrativa",
      descricao: "Cadastro sem fotografias",
      rua: "Rua Teste",
      numero: "1",
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
    const id = await salvar();
    let e = await api(`/api/estabelecimentos/${id}`);
    expect(e.fotos).toEqual([null, null, null]);
    resultados.push("Cadastro sem fotografia salva sem persistir ilustrações");
    await ir("/index.html");
    const card = page
      .locator("#estabelecimentos-inicio article")
      .filter({ hasText: dados.nome });
    await ilustrativa(
      card.locator(".foto-card"),
      card.locator(".creditos"),
      "pizzarias",
    );
    await ir(`/map.html?id=${id}&origem=aponte`);
    await ilustrativa(...painel(), "pizzarias");
    await semSetas();
    resultados.push("Próprio sem foto: início e painel, com galeria única");
    // Todas as categorias têm um recurso local válido, inclusive o fallback desconhecido.
    const categorias = await page.evaluate(() =>
      Object.keys(Aponte.categorias),
    );
    expect(categorias).toHaveLength(13);
    for (const categoria of [...categorias, "desconhecida"]) {
      const url = await page.evaluate((c) => Aponte.ilustracao(c), categoria);
      const r = await page.request.get(base + url);
      expect(r.status()).toBe(200);
      expect(r.headers()["content-type"]).toContain("image/svg+xml");
      await page.evaluate(
        (c) =>
          Aponte.galeria(document.getElementById("area-foto"), [], false, c),
        categoria,
      );
      await ilustrativa(
        ...painel(),
        categoria === "desconhecida" ? "restaurantes" : categoria,
      );
    }
    resultados.push(
      "13 SVGs locais carregam; categoria desconhecida usa restaurante",
    );
    // Contrato de photos ausente/vazio, getURI ausente/vazio/exceção e imagem quebrada.
    for (const caso of [
      "indefinido",
      "null",
      "vazio",
      "uri-vazio",
      "excecao",
      "quebrada",
    ]) {
      await page.evaluate((caso) => {
        const photos =
          caso === "indefinido"
            ? undefined
            : caso === "null"
              ? null
              : caso === "vazio"
                ? []
                : [
                    {
                      getURI: () => {
                        if (caso === "excecao")
                          throw new Error("Foto indisponível");
                        return caso === "quebrada"
                          ? "/imagens/00000000-0000-0000-0000-000000000000.png"
                          : "";
                      },
                      authorAttributions: [
                        { displayName: "Nunca exibir neste fallback" },
                      ],
                    },
                  ];
        Aponte.fotoGoogle(
          { primaryType: "cafe", photos },
          document.getElementById("foto-restaurante"),
          document.getElementById("creditos-foto"),
        );
      }, caso);
      await ilustrativa(...painel(), "cafeterias");
    }
    resultados.push(
      "Google sem fotos, URI vazio/exceção e URL quebrada usam categoria sem atribuição",
    );
    for (const placeId of [
      "Google-sem-fotos",
      "Google-foto-quebrada",
      "Google-fotos-reais",
    ]) {
      await ir(`/map.html?placeId=${placeId}`);
      if (placeId !== "Google-fotos-reais") {
        await ilustrativa(...painel(), "pizzarias");
        await semSetas();
      } else {
        await expect(page.locator("#foto-restaurante")).toHaveAttribute(
          "data-imagem-tipo",
          "fotografia",
        );
        await expect(page.locator("#creditos-foto")).toContainText(
          "Autor Google simulado 1",
        );
        await expect(
          page.locator("#creditos-foto .google-atribuicao"),
        ).toHaveCount(1);
        await expect(page.locator("[data-contador]")).toHaveText("1 / 3");
        await page.locator("[data-proxima]").click();
        await expect(page.locator("#creditos-foto")).toContainText(
          "Autor Google simulado 2",
        );
        await expect(page.locator("[data-contador]")).toHaveText("2 / 3");
        await page.locator("[data-anterior]").click();
        await expect(page.locator("[data-contador]")).toHaveText("1 / 3");
      }
    }
    resultados.push(
      "Painel Google: sem/broken fallback e 3 fotos reais simuladas com navegação e créditos",
    );
    // Todas as imagens reais falhando deixam somente uma ilustração.
    await page.evaluate(() =>
      Aponte.galeria(
        document.getElementById("area-foto"),
        [
          "/imagens/00000000-0000-0000-0000-000000000000.png",
          "/imagens/11111111-1111-1111-1111-111111111111.png",
        ],
        false,
        "docerias",
      ),
    );
    await ilustrativa(...painel(), "docerias");
    await semSetas();
    resultados.push("Galeria com todas as fotos quebradas oculta controles");
    // Uma falha isolada mantém a foto válida, sem inventar páginas adicionais.
    await page.evaluate(() =>
      Aponte.galeria(
        document.getElementById("area-foto"),
        [
          "/imagens/00000000-0000-0000-0000-000000000000.png",
          "/img/Asador.jpg",
        ],
        false,
        "docerias",
      ),
    );
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      "/img/Asador.jpg",
    );
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "data-imagem-tipo",
      "fotografia",
    );
    await semSetas();
    // O callback de uma foto anterior não pode repor créditos sobre a ilustração atual.
    await page.evaluate(() => {
      const img = document.getElementById("foto-restaurante"),
        creditos = document.getElementById("creditos-foto");
      Aponte.fotoGoogle(
        {
          primaryType: "cafe",
          photos: [
            {
              getURI: () => "/img/Asador.jpg",
              authorAttributions: [{ displayName: "Crédito antigo" }],
            },
          ],
        },
        img,
        creditos,
      );
      const callbackAntigo = img.onload;
      Aponte.fotoGoogle({ primaryType: "cafe", photos: [] }, img, creditos);
      callbackAntigo();
    });
    await ilustrativa(...painel(), "cafeterias");
    resultados.push(
      "Galeria pula foto quebrada; callbacks antigos não repõem créditos sobre ilustrações",
    );
    // Cadastro com upload real pelo formulário; edição sem alteração preserva os 3 arquivos.
    await editar(id);
    await page.locator("#adicionar-fotografias").check();
    await expect(page.locator("#foto-vazia")).toBeVisible();
    await expect(page.locator("#foto-preview")).toBeHidden();
    for (const [sel, n] of [
      ["#foto", "Asador.jpg"],
      ["#foto-2", "lasai.jpg"],
      ["#foto-3", "maido.jpeg"],
    ])
      await page.locator(sel).setInputFiles(foto(n));
    await salvar(id);
    const fotosReais = (await api(`/api/estabelecimentos/${id}`)).fotos;
    expect(fotosReais.filter(Boolean)).toHaveLength(3);
    await editar(id);
    await expect(page.locator("#adicionar-fotografias")).toBeChecked();
    await page.locator("#descricao").fill("Edição preserva fotos");
    await salvar(id);
    expect((await api(`/api/estabelecimentos/${id}`)).fotos).toEqual(
      fotosReais,
    );
    await ir(`/map.html?id=${id}&origem=aponte`);
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      fotosReais[0],
    );
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "data-imagem-tipo",
      "fotografia",
    );
    await expect(page.locator("[data-contador]")).toHaveText("1 / 3");
    await expect(page.locator("#creditos-foto")).toContainText(
      "Fotografia fornecida ao Aponte",
    );
    await page.locator("[data-proxima]").click();
    await expect(page.locator("#foto-restaurante")).toHaveAttribute(
      "src",
      fotosReais[1],
    );
    resultados.push(
      "Uploads reais, galeria de 3 fotos próprias e edição sem alteração preservam imagens",
    );
    // Uma foto própria quebrada afeta somente a apresentação; o banco mantém seu nome.
    await page.route("**" + fotosReais[0], (r) => r.abort());
    await ir("/index.html");
    await ilustrativa(
      card.locator(".foto-card"),
      card.locator(".creditos"),
      "pizzarias",
    );
    expect((await api(`/api/estabelecimentos/${id}`)).fotos).toEqual(
      fotosReais,
    );
    await page.unroute("**" + fotosReais[0]);
    resultados.push(
      "Foto própria quebrada usa ilustração sem modificar o registro",
    );
    await api("/api/usuarios", "POST", {
      nome: "Pessoa Ilustrativa",
      email: "ilustrativa@teste.test",
      senha: "SenhaIlustrativas123!",
      confirmacaoSenha: "SenhaIlustrativas123!",
    });
    await login("ilustrativa@teste.test");
    await ir(`/map.html?id=${id}&origem=aponte`);
    await page.locator("#favoritar").click();
    await expect
      .poll(async () => (await api("/api/me/favoritos")).length)
      .toBe(1);
    const avaliacao = await api("/api/me/avaliacoes", "POST", {
      referencia: { id },
      dados: { nota: 4, comentario: "Comentário preservado" },
    });
    const favorito = (await api("/api/me/favoritos"))[0];
    // Referência Google permanece idêntica; seus favoritos não dependem de fotos.
    const favoritoGoogle = await api("/api/me/favoritos", "POST", {
      googlePlaceId: "Google-sem-fotos",
    });
    const avaliacaoGoogle = await api("/api/me/avaliacoes", "POST", {
      referencia: { googlePlaceId: "Google-sem-fotos" },
      dados: { nota: 3, comentario: "Google sem fotos" },
    });
    await ir("/favoritos.html");
    const cardFavorito = page
      .locator("#lista-favoritos article")
      .filter({ hasText: dados.nome });
    await expect(cardFavorito.locator("img.foto-card")).toHaveAttribute(
      "src",
      fotosReais[0],
    );
    const cardGoogle = page.locator(
      '[data-google-place-id="Google-sem-fotos"]',
    );
    await ilustrativa(
      cardGoogle.locator("img.foto-card"),
      cardGoogle.locator(".creditos"),
      "pizzarias",
    );
    await login("admin:ilustrativas-teste");
    await editar(id);
    await page.locator("#sem-fotografia").check();
    // Escolher o modo não grava nem exclui antes da confirmação.
    expect((await api(`/api/estabelecimentos/${id}`)).fotos).toEqual(
      fotosReais,
    );
    page.once("dialog", (d) => d.dismiss());
    await page.locator("#salvar-estabelecimento").click();
    expect((await api(`/api/estabelecimentos/${id}`)).fotos).toEqual(
      fotosReais,
    );
    for (const url of fotosReais)
      expect((await page.request.get(base + url)).status()).toBe(200);
    page.once("dialog", (d) => d.accept());
    await salvar(id);
    e = await api(`/api/estabelecimentos/${id}`);
    expect(e.id).toBe(id);
    expect(e.googlePlaceId).toBeNull();
    expect(e.fotos).toEqual([null, null, null]);
    for (const url of fotosReais)
      expect((await page.request.get(base + url)).status()).toBe(404);
    resultados.push(
      "Sem fotografia exige confirmação: cancelar preserva arquivos; confirmar remove os 3 após commit e mantém ID",
    );
    await editar(id);
    await page.locator("#categoria").selectOption("cafeterias");
    await salvar(id);
    await ir(`/map.html?id=${id}&origem=aponte`);
    await ilustrativa(...painel(), "cafeterias");
    await semSetas();
    await page.screenshot({ path: path.join(art, "ilustrativas-painel.png") });
    resultados.push(
      "Mudança de categoria atualiza fallback do mesmo estabelecimento",
    );
    await login("ilustrativa@teste.test");
    expect(
      (await api("/api/me/favoritos")).find((f) => f.id === favorito.id)
        .estabelecimento.id,
    ).toBe(id);
    expect(
      (await api("/api/me/favoritos")).find((f) => f.id === favoritoGoogle.id)
        .estabelecimento.googlePlaceId,
    ).toBe("Google-sem-fotos");
    const avaliacoes = await api("/api/me/avaliacoes");
    expect(avaliacoes.find((a) => a.id === avaliacao.id).comentario).toBe(
      "Comentário preservado",
    );
    expect(
      avaliacoes.find((a) => a.id === avaliacaoGoogle.id).estabelecimento
        .googlePlaceId,
    ).toBe("Google-sem-fotos");
    expect((await api(`/api/avaliacoes/resumo?id=${id}`)).media).toBe(4);
    await ir("/favoritos.html");
    await ilustrativa(
      cardFavorito.locator("img.foto-card"),
      cardFavorito.locator(".creditos"),
      "cafeterias",
    );
    await ir("/index.html");
    const feed = page
      .locator("#avaliacoes-recentes article")
      .filter({ hasText: dados.nome });
    await ilustrativa(
      feed.locator(".foto-card"),
      feed.locator(".creditos"),
      "cafeterias",
    );
    const feedGoogle = page.locator('[data-feed-place="Google-sem-fotos"]');
    await ilustrativa(
      feedGoogle.locator(".foto-card"),
      feedGoogle.locator(".creditos"),
      "pizzarias",
    );
    resultados.push(
      "Favoritos, avaliações, notas, comentários, IDs e Place IDs preservados após remoção das fotos",
    );
    // Regressões das interações com referência própria e referência Google.
    for (const [ref, a] of [
      [{ id }, avaliacao],
      [{ googlePlaceId: "Google-sem-fotos" }, avaliacaoGoogle],
    ]) {
      const atualizado = await api(`/api/me/avaliacoes/${a.id}`, "PUT", {
        nota: 5,
        comentario: "Comentário editado",
      });
      expect(atualizado.nota).toBe(5);
      const query = new URLSearchParams(ref).toString();
      expect((await api("/api/avaliacoes/resumo?" + query)).media).toBe(5);
      await api(`/api/me/avaliacoes/${a.id}`, "DELETE");
      expect((await api("/api/avaliacoes/resumo?" + query)).quantidade).toBe(0);
      await api("/api/me/favoritos?" + query, "DELETE");
      await api("/api/me/favoritos", "POST", ref);
    }
    await ir("/favoritos.html");
    await cardFavorito
      .getByRole("button", { name: "Remover favorito" })
      .click();
    await expect(cardFavorito).toHaveCount(0);
    resultados.push(
      "Favoritar/desfavoritar e avaliação CRUD/consulta funcionam para próprios e Google",
    );
    await api("/api/me/favoritos", "POST", { id });
    for (const ref of [{ id }, { googlePlaceId: "Google-sem-fotos" }])
      await api("/api/me/avaliacoes", "POST", {
        referencia: ref,
        dados: { nota: 4, comentario: "Fixture responsiva" },
      });
    // Diferentes larguras, mesmos componentes, sem overflow nem imagens quebradas.
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const rota of [
        "/index.html",
        "/favoritos.html",
        "/map.html?origem=aponte",
        `/map.html?id=${id}&origem=aponte`,
        "/map.html?placeId=Google-sem-fotos",
      ]) {
        await ir(rota);
        for (const img of await page.locator("img[data-imagem-tipo]").all()) {
          if (!(await img.isVisible())) continue;
          await img.scrollIntoViewIfNeeded();
          await expect
            .poll(() => img.evaluate((n) => n.complete && n.naturalWidth > 0), {
              message: `Imagem visível em ${rota}, ${width}px`,
            })
            .toBe(true);
        }
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        ).toBe(true);
        if (rota.includes("id=")) {
          await ilustrativa(...painel(), "cafeterias");
          await semSetas();
        }
      }
    }
    await page.screenshot({
      path: path.join(art, "ilustrativas-mobile.png"),
      fullPage: true,
    });
    resultados.push(
      "Início/feed, favoritos, resultados e painéis sem imagens quebradas em 1440, 768 e 390 px",
    );
    await login("admin:ilustrativas-teste");
    await editar(id);
    await expect(page.locator("#sem-fotografia")).toBeChecked();
    await expect(page.locator("#sem-fotografia-aviso")).toBeVisible();
    await page.screenshot({
      path: path.join(art, "ilustrativas-formulario.png"),
      fullPage: true,
    });
    expect(erros).toEqual([]);
    fs.writeFileSync(
      path.join(art, "ilustrativas-resultado.json"),
      JSON.stringify(
        {
          resultado: "PASS",
          banco: "H2 isolado",
          google: "SDK simulado explicitamente",
          verificacoes: resultados,
        },
        null,
        2,
      ) + "\n",
    );
    console.log(
      JSON.stringify({ resultado: "PASS", verificacoes: resultados }),
    );
  } catch (e) {
    await page
      .screenshot({
        path: path.join(art, "ilustrativas-falha.png"),
        fullPage: true,
      })
      .catch(() => {});
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
