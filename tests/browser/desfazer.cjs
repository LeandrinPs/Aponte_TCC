// Integração real de interface, Spring e MySQL isolado. Exclusões definitivas usam o servidor.
const { iniciar } = require("./apoio.cjs");
const path = require("path");
(async () => {
  const t = await iniciar(),
    {
      page,
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
      base,
    } = t;
  const locais = [],
    contas = [],
    deletes = [],
    consultas = [],
    stamp = Date.now();
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (r.method() === "DELETE") deletes.push(u.pathname);
    if (u.pathname.endsWith("/exclusao")) consultas.push(u.pathname);
  });
  const linhaUsuario = (id) =>
    page.locator(`#tabela-usuarios tr[data-exclusao="usuario:${id}"]`);
  const linhaLocal = (id) =>
    page.locator(
      `#tabela-estabelecimentos tr[data-exclusao="estabelecimento:${id}"]`,
    );
  const toast = (tipo, id) =>
    page.locator(`.toast[data-exclusao-chave="${tipo}:${id}"]`);
  let itemLivre;
  try {
    await login();
    locais.push(await proprio("Livre com fotos " + stamp));
    locais.push(await proprio("Protegido por vínculos " + stamp));
    for (const nome of [
      "Sem vínculos",
      "Com favorito",
      "Com avaliação",
      "Com ambos",
      "Outra conta",
    ])
      contas.push(await usuario(nome));
    await api("/api/admin/cardapios", "POST", {
      referencia: { id: locais[1].id },
      dados: { nome: "Prato", descricao: "Cardápio próprio", preco: 12 },
    });
    for (let i = 1; i < contas.length; i++) {
      await login(contas[i].email, senha);
      if (i === 1 || i >= 3)
        await api("/api/me/favoritos", "POST", { id: locais[1].id });
      if (i >= 2)
        await api("/api/me/avaliacoes", "POST", {
          referencia: { id: locais[1].id },
          dados: { nota: 4, comentario: "Vínculo de teste" },
        });
      if (i === 4)
        await api("/api/me/favoritos", "POST", {
          googlePlaceId: "Ref-Google-Isolada-" + stamp,
        });
    }
    await login();
    await ir("/admin/estabelecimentos/" + locais[0].id);
    await expect(page.locator("#estabelecimento-form")).toHaveAttribute(
      "aria-busy",
      "false",
    );
    for (const sel of ["#foto", "#foto-2", "#foto-3"])
      await page
        .locator(sel)
        .setInputFiles(
          path.join(
            __dirname,
            "../../src/main/resources/static/img/Asador.jpg",
          ),
        );
    await page
      .getByRole("button", { name: "Salvar estabelecimento", exact: true })
      .click();
    await page.waitForURL("**/admin/estabelecimentos?id=" + locais[0].id);
    await expect(page.locator(".toast")).toContainText("Estabelecimento salvo");
    const fotos = (await api("/api/admin/estabelecimentos/" + locais[0].id))
      .fotos;
    expect(fotos.filter(Boolean)).toHaveLength(3);
    await expect(page.locator("#tabela-referencias-google")).toContainText(
      "Ref-Google-Isolada-" + stamp,
    );
    await expect(page.locator("#tabela-estabelecimentos")).not.toContainText(
      "Ref-Google-Isolada-" + stamp,
    );
    await expect(
      page
        .locator("#tabela-referencias-google")
        .getByRole("button", { name: "Excluir", exact: true }),
    ).toHaveCount(0);
    await expect(
      page
        .locator("#tabela-referencias-google")
        .getByRole("link", { name: "Editar", exact: true }),
    ).toHaveCount(0);
    await linhaLocal(locais[1].id)
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(page.locator(".toast-erro").last()).toContainText("favoritos");
    await expect(page.locator(".toast-erro").last()).toContainText(
      "avaliações",
    );
    await expect(page.locator(".toast-erro").last()).toContainText("cardápio");
    expect(
      deletes.filter((p) => p.endsWith("/estabelecimentos/" + locais[1].id)),
    ).toHaveLength(0);
    await expect(toast("estabelecimento", locais[1].id)).toHaveCount(0);
    await ir("/admin/usuarios");
    await linhaUsuario(contas[0].id)
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(toast("usuario", contas[0].id)).toContainText(
      "Exclusão agendada",
    );
    await expect(linhaUsuario(contas[0].id)).toHaveClass(/exclusao-pendente/);
    await expect(toast("usuario", contas[0].id)).not.toHaveClass(/showing/);
    await captura("admin-exclusao-agendada.png");
    await toast("usuario", contas[0].id)
      .getByRole("button", { name: "Desfazer", exact: true })
      .click();
    await page.waitForTimeout(7600);
    expect(
      deletes.filter((p) => p.endsWith("/usuarios/" + contas[0].id)),
    ).toHaveLength(0);
    await expect(linhaUsuario(contas[0].id)).toHaveCount(1);
    await expect(linhaUsuario(contas[0].id)).not.toHaveClass(
      /exclusao-pendente/,
    );
    // Dois pedidos no mesmo instante reservam uma única operação para a mesma linha.
    await linhaUsuario(contas[1].id)
      .getByRole("button", { name: "Excluir", exact: true })
      .evaluate((b) => {
        b.onclick();
        b.onclick();
      });
    await expect(toast("usuario", contas[1].id)).toContainText(
      "Exclusão agendada",
    );
    await linhaUsuario(contas[2].id)
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(toast("usuario", contas[2].id)).toContainText(
      "Exclusão agendada",
    );
    await toast("usuario", contas[2].id)
      .getByRole("button", { name: "Desfazer", exact: true })
      .click();
    await expect(linhaUsuario(contas[1].id)).toHaveCount(0, { timeout: 12000 });
    expect(
      deletes.filter((p) => p.endsWith("/usuarios/" + contas[1].id)),
    ).toHaveLength(1);
    expect(
      consultas.filter((p) =>
        p.endsWith("/usuarios/" + contas[1].id + "/exclusao"),
      ),
    ).toHaveLength(1);
    expect(
      deletes.filter((p) => p.endsWith("/usuarios/" + contas[2].id)),
    ).toHaveLength(0);
    await linhaUsuario(contas[3].id)
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(toast("usuario", contas[3].id)).toContainText(
      "Exclusão agendada",
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".toast").last()).toContainText(
      "canceladas ao sair ou recarregar",
    );
    await page.waitForTimeout(7600);
    await expect(linhaUsuario(contas[3].id)).toHaveCount(1);
    expect(
      deletes.filter((p) => p.endsWith("/usuarios/" + contas[3].id)),
    ).toHaveLength(0);
    await linhaUsuario(contas[3].id)
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(linhaUsuario(contas[3].id)).toHaveCount(0, { timeout: 12000 });
    const outro = await api(
      "/api/admin/usuarios/" + contas[4].id + "/exclusao",
    );
    expect(outro.favoritos).toBe(2);
    expect(outro.avaliacoes).toBe(1);
    await ir("/admin/estabelecimentos");
    await linhaLocal(locais[0].id)
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(toast("estabelecimento", locais[0].id)).toContainText(
      "Exclusão agendada",
    );
    itemLivre = await api("/api/admin/cardapios", "POST", {
      referencia: { id: locais[0].id },
      dados: {
        nome: "Vínculo concorrente",
        descricao: "Criado após a prévia",
        preco: 10,
      },
    });
    await expect(page.locator(".toast-erro").last()).toContainText(
      "item de cardápio",
      { timeout: 12000 },
    );
    await expect(linhaLocal(locais[0].id)).toHaveCount(1);
    for (const f of fotos)
      expect((await page.request.get(base + f)).status()).toBe(200);
    await api("/api/admin/cardapios/" + itemLivre.id, "DELETE");
    itemLivre = null;
    await linhaLocal(locais[0].id)
      .getByRole("button", { name: "Excluir", exact: true })
      .click();
    await expect(linhaLocal(locais[0].id)).toHaveCount(0, { timeout: 12000 });
    for (const f of fotos)
      expect((await page.request.get(base + f)).status()).toBe(404);
    await expect(
      page.locator(".toast:not([data-exclusao-chave])").last(),
    ).toContainText("Exclusão concluída");
    await page.setViewportSize({ width: 390, height: 844 });
    await ir("/admin/usuarios");
    await linhaUsuario(contas[0].id)
      .getByRole("button", { name: "Editar", exact: true })
      .click();
    await page.locator("#editar-usuario [name=nome]").fill("Nome alterado");
    await page.locator("#editar-usuario button").click();
    await expect(page.locator(".toast").last()).toContainText(
      "Usuário atualizado",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await captura("admin-toast-mobile.png");
    expect(erros).toEqual([]);
    console.log(
      "Administração: separação por origem, bloqueios específicos, Desfazer sem DELETE, repetição/simultaneidade, cancelamento ao recarregar, exclusão real de vínculos e três fotos, revalidação concorrente e toasts desktop/mobile passaram.",
    );
  } catch (e) {
    await captura("desfazer-falha.png");
    console.log(
      "Rota:",
      new URL(page.url()).pathname,
      "avisos:",
      await page.locator(".toast-body").allTextContents(),
    );
    throw e;
  } finally {
    try {
      await login();
      if (itemLivre)
        await api("/api/admin/cardapios/" + itemLivre.id, "DELETE");
      for (const u of contas) {
        try {
          await api("/api/admin/usuarios/" + u.id, "DELETE");
        } catch (e) {
          if (e.status !== 404) throw e;
        }
      }
      for (const e of locais) {
        try {
          for (const c of await api("/api/cardapios?id=" + e.id))
            await api("/api/admin/cardapios/" + c.id, "DELETE");
          await api("/api/admin/estabelecimentos/" + e.id, "DELETE");
        } catch (x) {
          if (x.status !== 404) throw x;
        }
      }
    } finally {
      await browser.close();
    }
  }
})();
