"use strict";
const perfilForm = document.getElementById("perfil-form");
let meuPerfil;
function aba() {
  const id = [
    "visao-geral",
    "avaliacoes",
    "favoritos",
    "configuracoes",
  ].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "visao-geral";
  document
    .querySelectorAll("[data-painel]")
    .forEach((n) => (n.hidden = n.id !== id));
  document.querySelectorAll("[data-aba]").forEach((n) => {
    n.classList.toggle("ativo", n.dataset.aba === id);
    n.setAttribute("aria-current", n.dataset.aba === id ? "page" : "false");
  });
}
window.addEventListener("hashchange", aba);
aba();
function perfil(u) {
  meuPerfil = u;
  document.querySelectorAll(".conta-nome").forEach(n=>n.textContent=u.nome);
  document.getElementById("perfil-nome").textContent = u.nome;
  const local =
    [u.cidade, u.estado].filter(Boolean).join(" — ") ||
    "Localização não informada";
  document.getElementById("perfil-local").textContent = local;
  document.getElementById("sobre-local").textContent = local;
  document.getElementById("perfil-desde").textContent = u.criadoEm
    ? new Date(u.criadoEm).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : "Data de cadastro não registrada";
  for (const k of ["nome", "email", "cidade", "estado"])
    perfilForm.elements[k].value = u[k] || "";
  document.getElementById("perfil-avatar").src = u.fotoUrl;
  document.getElementById("avatar-preview").src = u.fotoUrl;
  document.getElementById("remover-avatar").hidden =
    !u.fotoUrl.startsWith("/imagens/");
  document.getElementById("senha-perfil-form").hidden = !u.senhaLocal;
  document.getElementById("google-perfil-status").textContent =
    u.googleVinculado
      ? "Conta Google vinculada ao seu perfil."
      : "Você pode manter o login local e vincular uma conta Google.";
  const vinculo = document.getElementById("google-vinculo-form");
  if (vinculo) vinculo.hidden = u.googleVinculado || !u.senhaLocal;
  document.querySelectorAll(".avatar-nav").forEach((n) => (n.src = u.fotoUrl));
}
async function avaliacoes() {
  const lista = document.getElementById("minhas-avaliacoes");
  lista.setAttribute("aria-busy", "true");
  try {
    const itens = await Aponte.api("/api/me/avaliacoes");
    document.getElementById("total-avaliacoes").textContent = itens.length;
    lista.replaceChildren();
    if (!itens.length)
      lista.append(
        Aponte.el(
          "p",
          "vazio",
          "Você ainda não avaliou nenhum lugar. Encontre um estabelecimento no mapa para compartilhar sua experiência.",
        ),
      );
    for (const a of itens) {
      const e = a.estabelecimento,
        card = Aponte.el("article", "minha-avaliacao");
      card.append(
        Aponte.el(
          "h3",
          "h5",
          e.dadosProprios?.nome || "Estabelecimento Google",
        ),
        Aponte.el(
          "div",
          "estrelas",
          "★".repeat(a.nota) + "☆".repeat(5 - a.nota),
        ),
        Aponte.el(
          "small",
          "text-secondary",
          a.criadoEm
            ? new Date(a.criadoEm).toLocaleDateString("pt-BR")
            : "Data não registrada",
        ),
        Aponte.el("p", "mt-3", a.comentario || "Sem comentário escrito."),
      );
      const link = Aponte.el(
        "a",
        "btn btn-outline-danger me-2",
        "Ver ou editar no mapa",
      );
      link.href = Aponte.linkMapa(e);
      const excluir = Aponte.el(
        "button",
        "btn btn-outline-secondary",
        "Excluir avaliação",
      );
      excluir.onclick = async () => {
        Aponte.ocupado(excluir, true);
        try {
          await Aponte.api("/api/me/avaliacoes/" + a.id, { method: "DELETE" });
          await avaliacoes();
        } catch (err) {
          Aponte.aviso(err.message, true, "perfil-status");
          Aponte.ocupado(excluir, false);
        }
      };
      card.append(link, excluir);
      lista.append(card);
    }
  } catch (e) {
    lista.replaceChildren();
    Aponte.aviso(e.message, true, "perfil-status");
  } finally {
    Aponte.pronto(lista);
  }
}
document.addEventListener("favoritos-carregados", (e) => {
  document.getElementById("total-favoritos").textContent = e.detail;
});
Aponte.api("/api/me")
  .then(perfil)
  .catch((e) => Aponte.aviso(e.message, true, "perfil-status"));
avaliacoes();
perfilForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const b = e.target.querySelector("button");
  Aponte.ocupado(b, true, "Salvando…");
  try {
    perfil(
      await Aponte.api("/api/me", {
        method: "PUT",
        body: Object.fromEntries(new FormData(e.target)),
      }),
    );
    Aponte.aviso("Perfil atualizado.", false, "perfil-status");
  } catch (err) {
    Aponte.aviso(err.message, true, "perfil-status");
  } finally {
    Aponte.ocupado(b, false);
  }
});
const fotoInput = document.getElementById("foto-perfil");
let previewUrl;
fotoInput.addEventListener("change", () => {
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  const f = fotoInput.files[0];
  if (f) {
    previewUrl = URL.createObjectURL(f);
    document.getElementById("avatar-preview").src = previewUrl;
    location.hash = "configuracoes";
  }
});
document
  .getElementById("foto-perfil-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button[type=submit]");
    Aponte.ocupado(b, true, "Enviando…");
    try {
      const f = fotoInput.files[0];
      if (!f) throw new Error("Selecione uma fotografia.");
      if (f.size > 5 * 1024 * 1024)
        throw new Error("A fotografia deve ter até 5 MB.");
      const fd = new FormData();
      fd.append("arquivo", f);
      perfil(await Aponte.api("/api/me/foto", { method: "POST", body: fd }));
      fotoInput.value = "";
      Aponte.aviso("Fotografia atualizada.", false, "perfil-status");
    } catch (err) {
      Aponte.aviso(err.message, true, "perfil-status");
    } finally {
      Aponte.ocupado(b, false);
    }
  });
document
  .getElementById("remover-avatar")
  .addEventListener("click", async (e) => {
    const b = e.currentTarget;
    Aponte.ocupado(b, true);
    try {
      await Aponte.api("/api/me/foto", { method: "DELETE" });
      perfil(await Aponte.api("/api/me"));
      Aponte.aviso("Fotografia removida.", false, "perfil-status");
    } catch (err) {
      Aponte.aviso(err.message, true, "perfil-status");
    } finally {
      Aponte.ocupado(b, false);
    }
  });
document
  .getElementById("senha-perfil-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    Aponte.ocupado(b, true);
    try {
      await Aponte.api("/api/me/senha", {
        method: "PUT",
        body: Object.fromEntries(new FormData(e.target)),
      });
      e.target.reset();
      Aponte.aviso("Senha atualizada.", false, "perfil-status");
    } catch (err) {
      Aponte.aviso(err.message, true, "perfil-status");
    } finally {
      Aponte.ocupado(b, false);
    }
  });
document
  .getElementById("google-vinculo-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const b = e.target.querySelector("button");
    Aponte.ocupado(b, true);
    try {
      await Aponte.api("/api/me/google/vinculo", {
        method: "POST",
        body: Object.fromEntries(new FormData(e.target)),
      });
      location.href = "/oauth2/authorization/google";
    } catch (err) {
      Aponte.aviso(err.message, true, "perfil-status");
      Aponte.ocupado(b, false);
    }
  });
