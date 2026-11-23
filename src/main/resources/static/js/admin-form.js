"use strict";
const form = document.getElementById("estabelecimento-form");
let registroId =
  /\/admin\/estabelecimentos\/(\d+)$/.exec(location.pathname)?.[1] || null;
let mapaCadastro, marcadorCadastro;
function coordenadas() {
  if (!form.elements.latitude.value || !form.elements.longitude.value)
    return null;
  const lat = Number(form.elements.latitude.value),
    lng = Number(form.elements.longitude.value);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
function posicionar() {
  const p = coordenadas();

  if (!mapaCadastro || !p) return;

  if (marcadorCadastro) {
    marcadorCadastro.position = p;
  }

  mapaCadastro.panTo(p);
}
window.initMapaCadastro = async () => {
  try {
    mapaCadastro = new google.maps.Map(
      document.getElementById("mapa-cadastro"),
      {
        center: coordenadas() || { lat: -20.2839, lng: -50.2464 },
        zoom: 15,
        mapId: document.getElementById("mapa-cadastro").dataset.mapId,
      },
    );
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    marcadorCadastro = new AdvancedMarkerElement({
      map: mapaCadastro,
      position: coordenadas() || mapaCadastro.getCenter(),
    });

    posicionar();
    iconeAtual();
    mapaCadastro.addListener("click", (e) => {
      form.elements.latitude.value = e.latLng.lat().toFixed(6);
      form.elements.longitude.value = e.latLng.lng().toFixed(6);
      posicionar();
    });
  } catch (e) {
    Aponte.aviso(
      "O mapa de seleção não carregou. Informe latitude e longitude manualmente.",
      true,
    );
  }
};
for (const campo of ["latitude", "longitude"])
  form.elements[campo].addEventListener("change", posicionar);
const categoria = form.elements.categoria,
  icone = form.elements.icone;
for (const [chave, d] of Object.entries(Aponte.categorias)) {
  const op = Aponte.el("option", "", d.icone + " " + d.nome);
  op.value = chave;
  categoria.append(op);
  const oi = op.cloneNode(true);
  icone.append(oi);
  const l = Aponte.el("label", "form-check-label small"),
    c = Aponte.el("input", "form-check-input me-1");
  c.type = "checkbox";
  c.name = "tag";
  c.value = chave;
  l.append(c, d.nome);
  document.getElementById("tags-opcoes").append(l);
}
function iconeAtual() {
  document.getElementById("icone-preview").textContent = Aponte.iconeProprio({
    categoria: categoria.value,
    icone: icone.value,
  });
  if (marcadorCadastro) {
    const n = Aponte.pin(
      Aponte.iconeProprio({ categoria: categoria.value, icone: icone.value }),
      "aponte",
    );
    marcadorCadastro.replaceChildren(n);
  }
}
categoria.addEventListener("change", iconeAtual);
icone.addEventListener("change", iconeAtual);
function idFoto(base, p) {
  return base + (p === 1 ? "" : "-" + p);
}
let fotosSalvas = {};
const semFotografia = document.getElementById("sem-fotografia");
function atualizarModoFotografias() {
  const sem = semFotografia.checked;
  document.getElementById("campos-fotografias").hidden = sem;
  const aviso = document.getElementById("sem-fotografia-aviso");
  aviso.hidden = !sem;
  aviso.replaceChildren(
    Aponte.el("i", "bi bi-image"),
    " ",
    Aponte.fotografiasProprias(fotosSalvas).length
      ? "As fotografias cadastradas serão removidas após sua confirmação ao salvar. O site exibirá uma imagem ilustrativa da categoria."
      : "Sem fotografias cadastradas. O site exibirá uma imagem ilustrativa da categoria.",
  );
  for (let p = 1; p <= 3; p++)
    document.getElementById(idFoto("foto", p)).disabled = sem;
}
for (const radio of form.querySelectorAll('[name="modoFotografias"]'))
  radio.addEventListener("change", atualizarModoFotografias);
function previa(p, url) {
  const img = document.getElementById(idFoto("foto-preview", p)),
    vazio = document.getElementById(idFoto("foto-vazia", p));
  img.onload = img.onerror = null;
  img.hidden = !url;
  vazio.hidden = !!url;
  vazio.lastChild.textContent = " Sem fotografia nesta posição";
  if (!url) {
    img.removeAttribute("src");
    return;
  }
  img.onerror = () => {
    img.onerror = null;
    img.hidden = true;
    vazio.hidden = false;
    vazio.lastChild.textContent =
      " Prévia indisponível. Você pode substituir ou remover a fotografia.";
    img.removeAttribute("src");
  };
  img.src = url;
}
function fotoAtual(e) {
  fotosSalvas = e;
  for (let p = 1; p <= 3; p++) {
    const candidata = e.fotos?.[p - 1] || (p === 1 ? e.fotoUrl : null),
      url = candidata?.startsWith("/imagens/") ? candidata : null;
    if (!document.getElementById(idFoto("foto", p)).files.length)
      previa(p, url);
    document.getElementById(idFoto("remover-foto", p)).hidden = !url;
    if (p > 1) document.getElementById("principal-" + p).hidden = !url;
  }
  atualizarModoFotografias();
}
(async () => {
  if (!registroId) return;
  form.setAttribute("aria-busy", "true");
  const campos = [...form.querySelectorAll("input,select,button")];
  campos.forEach((n) => (n.disabled = true));
  Aponte.aviso("Carregando cadastro…");
  try {
    const e = await Aponte.api("/api/admin/estabelecimentos/" + registroId);
    if (!e.dadosProprios)
      throw new Error("Referências Google não podem ser editadas.");
    for (const [k, v] of Object.entries(e.dadosProprios)) {
      if (k !== "tags" && form.elements[k])
        form.elements[k].value =
          v ||
          (k === "categoria" ? "restaurantes" : k === "icone" ? "auto" : "");
    }
    for (const c of form.querySelectorAll("[name=tag]"))
      c.checked = e.dadosProprios.tags?.includes(c.value) || false;
    semFotografia.checked = !Aponte.fotografiasProprias(e).length;
    document.getElementById("adicionar-fotografias").checked =
      !semFotografia.checked;
    fotoAtual(e);
    posicionar();
    iconeAtual();
    campos.forEach((n) => (n.disabled = false));
    atualizarModoFotografias();
    form.setAttribute("aria-busy", "false");
    Aponte.aviso("");
  } catch (e) {
    Aponte.aviso(e.message, true);
    form.setAttribute("aria-busy", "false");
    document.getElementById("salvar-estabelecimento").disabled = true;
  }
})();
const urls = new Map();
for (let p = 1; p <= 3; p++) {
  const input = document.getElementById(idFoto("foto", p));
  input.addEventListener("change", () => {
    if (urls.has(p)) URL.revokeObjectURL(urls.get(p));
    const f = input.files[0];
    if (f) {
      const url = URL.createObjectURL(f);
      urls.set(p, url);
      previa(p, url);
    } else {
      urls.delete(p);
      fotoAtual(fotosSalvas);
    }
  });
  document
    .getElementById(idFoto("remover-foto", p))
    .addEventListener("click", async (e) => {
      if (!registroId) return;
      const b = e.currentTarget;
      Aponte.ocupado(b, true);
      try {
        await Aponte.api(
          `/api/admin/estabelecimentos/${registroId}/fotos/${p}`,
          { method: "DELETE" },
        );
        input.value = "";
        fotoAtual(
          await Aponte.api("/api/admin/estabelecimentos/" + registroId),
        );
        Aponte.aviso("Fotografia removida.");
      } catch (err) {
        Aponte.aviso(err.message, true);
      } finally {
        Aponte.ocupado(b, false);
      }
    });
  if (p > 1)
    document
      .getElementById("principal-" + p)
      .addEventListener("click", async (e) => {
        const b = e.currentTarget;
        Aponte.ocupado(b, true);
        try {
          fotoAtual(
            await Aponte.api(
              `/api/admin/estabelecimentos/${registroId}/fotos/${p}/principal`,
              { method: "PUT" },
            ),
          );
          Aponte.aviso("Fotografia principal alterada.");
        } catch (err) {
          Aponte.aviso(err.message, true);
        } finally {
          Aponte.ocupado(b, false);
        }
      });
}
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const sem = semFotografia.checked;
  const confirmarRemocao = () =>
    window.confirm(
      "Remover todas as fotografias deste estabelecimento ao salvar? O cadastro, seus favoritos e suas avaliações serão preservados.",
    );
  let remocaoConfirmada = false;
  if (sem && Aponte.fotografiasProprias(fotosSalvas).length) {
    remocaoConfirmada = confirmarRemocao();
    if (!remocaoConfirmada) return;
  }
  const b = document.getElementById("salvar-estabelecimento");
  Aponte.ocupado(b, true, "Salvando…");
  let salvo = false,
    posicao = 0,
    removendoFotos = false;
  try {
    for (let p = 1; !sem && p <= 3; p++) {
      const f = document.getElementById(idFoto("foto", p)).files[0];
      if (
        f &&
        (f.size > 5 * 1024 * 1024 ||
          !["image/jpeg", "image/png"].includes(f.type))
      )
        throw new Error(`A fotografia ${p} deve ser JPEG ou PNG de até 5 MB.`);
    }
    const dados = Object.fromEntries(new FormData(form));
    delete dados.tag;
    delete dados.modoFotografias;
    dados.tags = [...form.querySelectorAll("[name=tag]:checked")].map(
      (c) => c.value,
    );
    let e = await Aponte.api(
      "/api/admin/estabelecimentos" + (registroId ? "/" + registroId : ""),
      { method: registroId ? "PUT" : "POST", body: dados },
    );
    registroId = e.id;
    salvo = true;
    history.replaceState(null, "", "/admin/estabelecimentos/" + registroId);
    if (sem && Aponte.fotografiasProprias(e).length) {
      // Uma foto pode ter sido adicionada por outro administrador desde a abertura.
      if (!remocaoConfirmada && !confirmarRemocao()) {
        fotoAtual(e);
        Aponte.aviso(
          "Cadastro salvo. Remoção cancelada; fotografias preservadas.",
        );
        return;
      }
      removendoFotos = true;
      e = await Aponte.api(`/api/admin/estabelecimentos/${registroId}/fotos`, {
        method: "DELETE",
      });
      removendoFotos = false;
    }
    fotoAtual(e);
    for (let p = 1; !sem && p <= 3; p++) {
      const input = document.getElementById(idFoto("foto", p));
      const arquivo = input.files[0];
      if (!arquivo) continue;
      posicao = p;
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      e = await Aponte.api(
        `/api/admin/estabelecimentos/${registroId}/fotos/${p}`,
        { method: "POST", body: fd },
      );
      input.value = "";
      fotoAtual(e);
    }
    AdminAvisos.aoRetornar("Estabelecimento salvo com sucesso.");
    location.href = "/admin/estabelecimentos?id=" + registroId;
  } catch (e) {
    Aponte.aviso(
      (salvo
        ? removendoFotos
          ? "Cadastro salvo, mas não foi possível remover as fotografias: "
          : `Cadastro salvo. Verifique a fotografia ${posicao || "selecionada"}: `
        : "") + e.message,
      true,
    );
  } finally {
    Aponte.ocupado(b, false);
  }
});

window.addEventListener("pagehide", () => {
  for (const url of urls.values()) URL.revokeObjectURL(url);
});
atualizarModoFotografias();
