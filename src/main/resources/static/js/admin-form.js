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
  marcadorCadastro.position = p;
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
    const n = Aponte.el(
      "div",
      "icone-comida",
      Aponte.iconeProprio({ categoria: categoria.value, icone: icone.value }),
    );
    marcadorCadastro.replaceChildren(n);
  }
}
categoria.addEventListener("change", iconeAtual);
icone.addEventListener("change", iconeAtual);
function idFoto(base, p) {
  return base + (p === 1 ? "" : "-" + p);
}
function fotoAtual(e) {
  for (let p = 1; p <= 3; p++) {
    const url = e.fotos?.[p - 1] || (p === 1 ? e.fotoUrl : null);
    if (!document.getElementById(idFoto("foto", p)).files.length)
      Aponte.imagem(document.getElementById(idFoto("foto-preview", p)), url);
    document.getElementById(idFoto("remover-foto", p)).hidden =
      !url?.startsWith("/imagens/");
    if (p > 1)
      document.getElementById("principal-" + p).hidden =
        !url?.startsWith("/imagens/");
  }
}
(async () => {
  if (!registroId) return;
  form.setAttribute("aria-busy","true");
  const campos=[...form.querySelectorAll("input,select,button")];campos.forEach(n=>n.disabled=true);
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
    fotoAtual(e);
    posicionar();
    iconeAtual();
    campos.forEach(n=>n.disabled=false);
    form.setAttribute("aria-busy","false");
    Aponte.aviso("");
  } catch (e) {
    Aponte.aviso(e.message, true);
    form.setAttribute("aria-busy","false");
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
      document.getElementById(idFoto("foto-preview", p)).src = url;
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
  const b = document.getElementById("salvar-estabelecimento");
  Aponte.ocupado(b, true, "Salvando…");
  let salvo = false,
    posicao = 0;
  try {
    for (let p = 1; p <= 3; p++) {
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
    for (let p = 1; p <= 3; p++) {
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
    location.href = "/admin/estabelecimentos?id=" + registroId;
  } catch (e) {
    Aponte.aviso(
      (salvo
        ? `Cadastro salvo. Verifique a fotografia ${posicao || "selecionada"}: `
        : "") + e.message,
      true,
    );
  } finally {
    Aponte.ocupado(b, false);
  }
});
