const { iniciar } = require("./apoio.cjs");
const configurarSDK = require("./sdk-exploracao.cjs");
(async () => {
  const t = await iniciar(),
    {
      page,
      context,
      expect,
      ir,
      api,
      login,
      proprio,
      usuario,
      senha,
      captura,
      erros,
      browser,
    } = t;
  const stamp = Date.now(),
    nomes = {
      perto: "Almoço Aponte Perto " + stamp,
      melhor: "Almoço Aponte Melhor " + stamp,
      popular: "Almoço Aponte Popular " + stamp,
    };
  const locais = [],
    contas = [];
  await configurarSDK(context, {
    centro: { lat: -20.2839, lng: -50.2464 },
    duplicado: nomes.perto,
  });
  const abrirMapa = async (query) => {
    await ir("/map.html" + query);
    await page.waitForFunction(() => typeof window.initMap === "function");
    await page.evaluate(() => window.initMap());
    await expect(page.locator("#lista-resultados")).toHaveAttribute(
      "aria-busy",
      "false",
    );
  };
  const chaves = () =>
    page
      .locator("#lista-resultados [data-resultado]")
      .evaluateAll((ns) => ns.map((n) => n.dataset.resultado));
  const chamadas = () => page.evaluate(() => window.__consultas.length);
  try {
    await login();
    locais.push(await proprio(nomes.perto));
    locais.push(await proprio(nomes.melhor, { longitude: "-50.2324" }));
    locais.push(await proprio(nomes.popular, { longitude: "-50.2344" }));
    for (const cat of [
      "italiana",
      "mexicana",
      "chinesa",
      "vegetariana",
      "frutos-do-mar",
      "docerias",
    ])
      locais.push(
        await proprio(
          cat === "docerias"
            ? "Doce Aponte " + stamp
            : "Aponte " + cat + " " + stamp,
          { categoria: cat, longitude: "-50.2424" },
        ),
      );
    for (let i = 0; i < 3; i++) contas.push(await usuario("Avaliador " + i));
    for (let i = 0; i < contas.length; i++) {
      await login(contas[i].email, senha);
      const notas =
        i === 0
          ? [
              [locais[0], 2],
              [locais[1], 5],
              [locais[2], 3],
            ]
          : [[locais[2], 3]];
      for (const [e, nota] of notas)
        await api("/api/me/avaliacoes", "POST", {
          referencia: { id: e.id },
          dados: { nota, comentario: "Avaliação isolada" },
        });
    }
    await abrirMapa("?categoria=pizzarias");
    await expect(page.locator("#filtros-mapa select")).toHaveCount(3);
    await expect(page.locator("#filtro-distancia")).toHaveValue("2000");
    expect(await chaves()).toHaveLength(5);
    expect((await chaves())[0]).toBe("aponte:" + locais[0].id);
    const n = await chamadas();
    await page.locator("#filtro-ordem").selectOption("notas");
    expect((await chaves())[0]).toBe("aponte:" + locais[1].id);
    await expect(
      page.locator(`[data-resultado="aponte:${locais[1].id}"] .resultado-nota`),
    ).toContainText("5,0");
    await page.locator("#filtro-ordem").selectOption("quantidade");
    expect((await chaves())[0]).toBe("google:G-Perto");
    expect(await chamadas()).toBe(n);
    await page.locator("#filtro-origem").selectOption("aponte");
    expect(await chaves()).toHaveLength(3);
    expect(
      await page.evaluate(() =>
        __marcadores
          .filter((m) => m.map)
          .every((m) => m.chave?.startsWith("aponte:")),
      ),
    ).toBe(true);
    await page.locator("#filtro-origem").selectOption("google");
    expect(await chaves()).toHaveLength(3);
    expect((await chaves()).includes("google:G-Duplicado")).toBe(true);
    expect(
      await page.evaluate(() =>
        __marcadores
          .filter((m) => m.map)
          .every((m) => m.chave?.startsWith("google:")),
      ),
    ).toBe(true);
    await page.locator("#filtro-origem").selectOption("todos");
    expect(await chaves()).toHaveLength(5);
    expect(await chamadas()).toBe(n);
    const antes = await chaves();
    await page
      .locator(`[data-resultado="aponte:${locais[1].id}"] .resultado-abrir`)
      .click();
    await expect(page.locator("#explorar-resultados")).toBeHidden();
    await expect(page.locator("#painel-restaurante")).toHaveClass(/aberto/);
    await page
      .getByRole("button", { name: "Voltar aos resultados", exact: true })
      .click();
    await expect(page.locator("#explorar-resultados")).toBeVisible();
    expect(await chaves()).toEqual(antes);
    await expect(page.locator("#filtro-ordem")).toHaveValue("quantidade");
    expect(await chamadas()).toBe(n);
    await page.locator("#filtro-distancia").selectOption("1000");
    await expect(
      page.locator("#lista-resultados [data-resultado]"),
    ).toHaveCount(2);
    expect(
      await page.evaluate(() => __consultas.at(-1).locationRestriction.radius),
    ).toBe(1000);
    await page.locator("#filtro-distancia").selectOption("5000");
    await expect(
      page.locator("#lista-resultados [data-resultado]"),
    ).toHaveCount(6);
    await page.locator("#filtro-distancia").selectOption("10000");
    await expect(
      page.locator("#lista-resultados [data-resultado]"),
    ).toHaveCount(7);
    await page.locator("#filtro-distancia").selectOption("2000");
    await expect(
      page.locator("#lista-resultados [data-resultado]"),
    ).toHaveCount(5);
    const pins = await page.evaluate(() =>
      __marcadores
        .filter((m) => m.map)
        .map((m) => ({
          origem: m.chave.split(":")[0],
          cor: getComputedStyle(m.content).color,
          top: m.anchorTop,
          left: m.anchorLeft,
          altura: m.content.getBoundingClientRect().height,
          svg: !!m.content.querySelector("svg path"),
        })),
    );
    for (const p of pins) {
      expect(p.top).toBe("-100%");
      expect(p.left).toBe("-50%");
      expect(p.svg).toBe(true);
      expect(p.cor).toBe(
        p.origem === "google" ? "rgb(242, 183, 5)" : "rgb(220, 53, 69)",
      );
    }
    await page.evaluate(() =>
      __marcadores
        .find((m) => m.map && m.chave === "google:G-Perto")
        .listeners["gmp-click"](),
    );
    await expect(page.locator("#nome-restaurante")).toHaveText(
      "Almoço Google Perto",
    );
    await expect(page.locator("#media-google")).toHaveText("3,5");
    await page.locator("#fechar-painel").click();
    await page.locator("#filtro-ordem").selectOption("proximos");
    await page
      .locator("#explorar-resultados")
      .evaluate((n) => (n.scrollTop = 0));
    await captura("exploracao-simulada-desktop.png");
    await abrirMapa("?categoria=pizzarias&busca=Almo%C3%A7o");
    expect(await chaves()).toHaveLength(5);
    const req = await page.evaluate(() => __consultas.at(-1));
    expect(req.tipo).toBe("texto");
    expect(req.locationRestriction.north).toBeGreaterThan(
      req.locationRestriction.south,
    );
    expect(req.fields).toContain("rating");
    expect(req.fields).toContain("userRatingCount");
    await page.locator("#filtro-distancia").selectOption("1000");
    await expect(
      page.locator("#lista-resultados [data-resultado]"),
    ).toHaveCount(2);
    await page.locator("#filtro-origem").selectOption("aponte");
    await expect(
      page.locator("#lista-resultados [data-resultado]"),
    ).toHaveCount(1);
    for (const cat of [
      "italiana",
      "mexicana",
      "chinesa",
      "vegetariana",
      "frutos-do-mar",
      "docerias",
    ]) {
      await abrirMapa("?categoria=" + cat);
      const queries = await page.evaluate(() => __consultas);
      expect(queries.at(-1).includedTypes.length).toBe(
        cat === "docerias" ? 9 : 1,
      );
      expect(await chaves()).toHaveLength(cat === "docerias" ? 3 : 2);
      expect((await chaves()).some((k) => k.startsWith("aponte:"))).toBe(true);
      expect((await chaves()).some((k) => k.startsWith("google:"))).toBe(true);
    }
    await abrirMapa("?categoria=docerias&busca=Doce");
    expect(await chaves()).toHaveLength(3);
    expect(
      await page.evaluate(() => __consultas.at(-1).includedType),
    ).toBeUndefined();
    await page.setViewportSize({ width: 390, height: 844 });
    await abrirMapa("?categoria=pizzarias");
    await expect(page.locator("#filtro-origem")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await captura("exploracao-simulada-mobile.png");
    await page
      .locator(`[data-resultado="aponte:${locais[0].id}"] .resultado-abrir`)
      .click();
    await expect(page.locator("#fechar-painel")).toBeVisible();
    await captura("detalhes-simulados-mobile.png");
    await page.locator("#fechar-painel").click();
    expect(erros).toEqual([]);
    console.log(
      "Exploração: três filtros combinados, raio estrito, ordenações distintas, origem/deduplicação, retorno sem nova busca, cache, seis categorias, pinos e desktop/mobile passaram com SDK substituto explícito.",
    );
  } catch (e) {
    await captura("exploracao-falha.png");
    console.log(
      "Rota:",
      new URL(page.url()).pathname,
      "estados:",
      await page.locator("[role=status]").allTextContents(),
    );
    throw e;
  } finally {
    try {
      await login();
      for (const u of contas)
        await api("/api/admin/usuarios/" + u.id, "DELETE");
      for (const e of locais)
        await api("/api/admin/estabelecimentos/" + e.id, "DELETE");
    } finally {
      await browser.close();
    }
  }
})();
