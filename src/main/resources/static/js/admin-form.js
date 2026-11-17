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
function fotoAtual(e) {
  Aponte.imagem(document.getElementById("foto-preview"), e.fotoUrl);
  document.getElementById("remover-foto").hidden =
    !e.fotoUrl.startsWith("/imagens/");
}
(async () => {
  if (!registroId) return;
  try {
    const e = await Aponte.api("/api/admin/estabelecimentos/" + registroId);
    if (!e.dadosProprios)
      throw new Error("Referências Google não podem ser editadas.");
    for (const [k, v] of Object.entries(e.dadosProprios))
      form.elements[k].value = v;
    fotoAtual(e);
    posicionar();
  } catch (e) {
    Aponte.aviso(e.message, true);
    document.getElementById("salvar-estabelecimento").disabled = true;
  }
})();
form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const b = document.getElementById("salvar-estabelecimento");
  b.disabled = true;
  let salvo = false;
  try {
    const foto = document.getElementById("foto").files[0];
    if (foto && foto.size > 5 * 1024 * 1024)
      throw new Error("A fotografia deve ter até 5 MB.");
    const dados = Object.fromEntries(new FormData(form));
    const e = await Aponte.api(
      "/api/admin/estabelecimentos" + (registroId ? "/" + registroId : ""),
      { method: registroId ? "PUT" : "POST", body: dados },
    );
    registroId = e.id;
    salvo = true;
    history.replaceState(null, "", "/admin/estabelecimentos/" + registroId);
    const arquivo = document.getElementById("foto").files[0];
    if (arquivo) {
      const fd = new FormData();
      fd.append("arquivo", arquivo);
      const atual = await Aponte.api(
        "/api/admin/estabelecimentos/" + registroId + "/foto",
        { method: "POST", body: fd },
      );
      fotoAtual(atual);
    }
    location.href = "/admin/estabelecimentos?id=" + registroId;
  } catch (e) {
    Aponte.aviso(
      (salvo ? "Cadastro salvo. A fotografia não foi enviada: " : "") +
        e.message,
      true,
    );
  } finally {
    b.disabled = false;
  }
});
document.getElementById("remover-foto").addEventListener("click", async () => {
  if (!registroId) return;
  try {
    await Aponte.api("/api/admin/estabelecimentos/" + registroId + "/foto", {
      method: "DELETE",
    });
    Aponte.imagem(document.getElementById("foto-preview"), null);
    document.getElementById("remover-foto").hidden = true;
    document.getElementById("foto").value = "";
    Aponte.aviso("Fotografia removida.");
  } catch (e) {
    Aponte.aviso(e.message, true);
  }
});
