"use strict";
const { api, el, aviso } = Aponte;
let usuarioEditado = null,
  selecionado = null,
  itemEditado = null;
async function usuarios() {
  const lista = await api("/api/admin/usuarios");
  const tabela = document.getElementById("tabela-usuarios");
  tabela.replaceChildren();
  for (const u of lista) {
    const tr = el("tr");
    tr.append(el("td", "", u.nome), el("td", "", u.email));
    const a = el("td", "acao-linha");
    const editar = el("button", "btn btn-outline-danger", "Editar");
    editar.onclick = () => {
      usuarioEditado = u.id;
      const f = document.getElementById("editar-usuario");
      f.hidden = false;
      f.elements.nome.value = u.nome;
      f.elements.email.value = u.email;
      f.scrollIntoView({ behavior: "smooth" });
    };
    const excluir = el("button", "btn btn-outline-secondary", "Excluir");
    excluir.onclick = async () => {
      if (!confirm("Excluir esta conta e suas avaliações e favoritos?")) return;
      try {
        await api("/api/admin/usuarios/" + u.id, { method: "DELETE" });
        await usuarios();
        aviso("Usuário excluído.");
      } catch (e) {
        aviso(e.message, true);
      }
    };
    a.append(editar, excluir);
    tr.append(a);
    tabela.append(tr);
  }
}
async function estabelecimentos() {
  const lista = await api("/api/admin/estabelecimentos");
  const tabela = document.getElementById("tabela-estabelecimentos");
  tabela.replaceChildren();
  for (const e of lista) {
    const tr = el("tr");
    tr.append(
      el("td", "", e.dadosProprios?.nome || e.googlePlaceId),
      el("td", "", e.googlePlaceId ? "Referência Google" : "Cadastro próprio"),
    );
    const a = el("td", "acao-linha");
    const ver = el("a", "btn btn-outline-secondary", "Mapa");
    ver.href = Aponte.linkMapa(e);
    a.append(ver);
    if (!e.googlePlaceId) {
      const editar = el("a", "btn btn-outline-danger", "Editar");
      editar.href = "/admin/estabelecimentos/" + e.id;
      a.append(editar);
      const excluir = el("button", "btn btn-outline-secondary", "Excluir");
      excluir.onclick = async () => {
        if (
          !confirm(
            "Excluir este cadastro próprio? Vínculos existentes impedem a exclusão.",
          )
        )
          return;
        try {
          await api("/api/admin/estabelecimentos/" + e.id, {
            method: "DELETE",
          });
          document.getElementById("manutencao").hidden = true;
          await estabelecimentos();
          aviso("Estabelecimento excluído.");
        } catch (err) {
          aviso(err.message, true);
        }
      };
      a.append(excluir);
    }
    const manter = el("button", "btn btn-danger", "Cardápio e avaliações");
    manter.onclick = () =>
      manutencao(e).catch((err) => aviso(err.message, true));
    a.append(manter);
    tr.append(a);
    tabela.append(tr);
  }
  const id = new URLSearchParams(location.search).get("id");
  if (id && !selecionado) {
    const e = lista.find((e) => String(e.id) === id);
    if (e) await manutencao(e);
  }
}
async function manutencao(e) {
  selecionado = e;
  itemEditado = null;
  document.getElementById("item-form").reset();
  document.getElementById("manutencao").hidden = false;
  document.getElementById("manutencao-titulo").textContent =
    e.dadosProprios?.nome || e.googlePlaceId;
  const [itens, avaliacoes] = await Promise.all([
    api("/api/cardapios?id=" + e.id),
    api("/api/avaliacoes?id=" + e.id),
  ]);
  const c = document.getElementById("admin-cardapios");
  c.replaceChildren();
  if (!itens.length) c.append(el("p", "", "Nenhum item cadastrado."));
  for (const item of itens) {
    const linha = el("div", "acao-linha border-bottom py-2");
    linha.append(
      el("span", "", `${item.nome} — R$ ${Number(item.preco).toFixed(2)}`),
    );
    const editar = el("button", "btn btn-outline-danger", "Editar item");
    editar.onclick = () => {
      itemEditado = item.id;
      const f = document.getElementById("item-form");
      for (const k of ["nome", "descricao", "preco"])
        f.elements[k].value = item[k];
    };
    const excluir = el("button", "btn btn-outline-secondary", "Excluir item");
    excluir.onclick = async () => {
      if (!confirm("Excluir este item de cardápio?")) return;
      try {
        await api("/api/admin/cardapios/" + item.id, { method: "DELETE" });
        await manutencao(e);
        aviso("Item excluído.");
      } catch (err) {
        aviso(err.message, true);
      }
    };
    linha.append(editar, excluir);
    c.append(linha);
  }
  const av = document.getElementById("admin-avaliacoes");
  av.replaceChildren();
  if (!avaliacoes.length)
    av.append(el("p", "", "Nenhuma avaliação do Aponte."));
  for (const a of avaliacoes) {
    const linha = el("div", "avaliacao-item");
    linha.append(
      el("strong", "", `${a.nota}/5 — usuário ${a.usuarioId}`),
      el("p", "", a.comentario || "Sem comentário"),
    );
    const excluir = el("button", "btn btn-outline-danger", "Remover avaliação");
    excluir.onclick = async () => {
      if (!confirm("Remover esta avaliação?")) return;
      try {
        await api("/api/admin/avaliacoes/" + a.id, { method: "DELETE" });
        await manutencao(e);
        aviso("Avaliação removida.");
      } catch (err) {
        aviso(err.message, true);
      }
    };
    linha.append(excluir);
    av.append(linha);
  }
  document.getElementById("manutencao").scrollIntoView({ behavior: "smooth" });
}
document
  .getElementById("editar-usuario")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    Aponte.ocupado(b, true, "Salvando…");
    try {
      await api("/api/admin/usuarios/" + usuarioEditado, {
        method: "PUT",
        body: Object.fromEntries(new FormData(e.target)),
      });
      e.target.hidden = true;
      await usuarios();
      aviso("Usuário atualizado.");
    } catch (err) {
      aviso(err.message, true);
    } finally {
      Aponte.ocupado(b, false);
    }
  });
document.getElementById("cancelar-item")?.addEventListener("click", () => {
  itemEditado = null;
  document.getElementById("item-form").reset();
});
document.getElementById("item-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!selecionado) return;
  const dados = Object.fromEntries(new FormData(e.target));
  dados.preco = Number(dados.preco);
  const b = e.target.querySelector("button");
  Aponte.ocupado(b, true, "Salvando…");
  try {
    await api(
      itemEditado
        ? "/api/admin/cardapios/" + itemEditado
        : "/api/admin/cardapios",
      {
        method: itemEditado ? "PUT" : "POST",
        body: itemEditado
          ? dados
          : { referencia: { id: selecionado.id }, dados },
      },
    );
    await manutencao(selecionado);
    aviso("Item salvo.");
  } catch (err) {
    aviso(err.message, true);
  } finally {
    Aponte.ocupado(b, false);
  }
});
(async () => {
  try {
    if (document.getElementById("indicadores")) {
      const alvo = document.getElementById("indicadores");
      Aponte.skeleton(alvo);
      const r = await api("/api/admin/resumo");
      alvo.replaceChildren();
      Aponte.pronto(alvo);
      const labels = {
        usuarios: "Usuários",
        estabelecimentos: "Registros internos",
        proprios: "Estabelecimentos próprios",
        referenciasGoogle: "Referências Google",
        favoritos: "Favoritos",
        avaliacoes: "Avaliações do Aponte",
      };
      for (const [k, label] of Object.entries(labels)) {
        const col = el("div", "col-md-4");
        const card = el("div", "indicador");
        card.append(el("span", "", label), el("strong", "", r[k]));
        col.append(card);
        document.getElementById("indicadores").append(col);
      }
    }
    const dist = document.getElementById("distribuicao");
    if (dist) {
      const r = await api("/api/admin/resumo"),
        total = r.proprios + r.referenciasGoogle;
      dist.replaceChildren();
      if (!total)
        dist.append(
          el("p", "vazio", "Nenhum estabelecimento registrado ainda."),
        );
      else {
        const barra = el("div", "barra-origem"),
          a = el("span"),
          b = el("span");
        a.style.width = (100 * r.proprios) / total + "%";
        b.style.width = (100 * r.referenciasGoogle) / total + "%";
        barra.setAttribute("aria-hidden", "true");
        barra.append(a, b);
        const legenda = el("div", "legenda-origem");
        legenda.append(
          el("span", "", `${r.proprios} próprios`),
          el("span", "", `${r.referenciasGoogle} referências Google`),
        );
        dist.append(barra, legenda);
      }
    }
    if (document.getElementById("tabela-usuarios")) await usuarios();
    if (document.getElementById("tabela-estabelecimentos"))
      await estabelecimentos();
  } catch (e) {
    document.querySelectorAll("[aria-busy=true]").forEach((n) => {
      n.replaceChildren();
      Aponte.pronto(n);
    });
    aviso(e.message, true);
  }
})();

document.querySelectorAll(".admin-sidebar nav>a").forEach((a) => {
  if (a.pathname === location.pathname) a.classList.add("ativo");
});
