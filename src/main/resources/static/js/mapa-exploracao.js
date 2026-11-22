/* Cálculos e ordenação compartilhados pelo mapa; sem dependência do SDK ou do DOM. */
(function (raiz) {
  "use strict";
  function coordenadas(valor) {
    if (!valor) return null;
    const la =
      typeof valor.lat === "function"
        ? valor.lat()
        : (valor.lat ?? valor.latitude);
    const lo =
      typeof valor.lng === "function"
        ? valor.lng()
        : (valor.lng ?? valor.longitude);
    if (
      la == null ||
      lo == null ||
      String(la).trim() === "" ||
      String(lo).trim() === ""
    )
      return null;
    const lat = Number(la),
      lng = Number(lo);
    return Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
      ? { lat, lng }
      : null;
  }
  function distancia(a, b) {
    a = coordenadas(a);
    b = coordenadas(b);
    if (!a || !b) return null;
    const rad = (n) => (n * Math.PI) / 180,
      dl = rad(b.lat - a.lat),
      dg = rad(b.lng - a.lng);
    const h =
      Math.sin(dl / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dg / 2) ** 2;
    return (
      6371008.8 *
      2 *
      Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)))
    );
  }
  function limites(centro, raio) {
    const delta = ((raio / 6371008.8) * 180) / Math.PI;
    const lon =
      Math.abs(Math.cos((centro.lat * Math.PI) / 180)) < 1e-8
        ? 180
        : Math.min(180, delta / Math.cos((centro.lat * Math.PI) / 180));
    const normal = (n) => ((((n + 180) % 360) + 360) % 360) - 180;
    return {
      north: Math.min(90, centro.lat + delta),
      south: Math.max(-90, centro.lat - delta),
      west: lon === 180 ? -180 : normal(centro.lng - lon),
      east: lon === 180 ? 180 : normal(centro.lng + lon),
    };
  }
  function normalizar(s) {
    return (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR")
      .trim();
  }
  function compararValor(a, b, desc = false) {
    if (a == null) return b == null ? 0 : 1;
    if (b == null) return -1;
    return desc ? b - a : a - b;
  }
  function ordenar(itens, ordem) {
    return [...itens].sort((a, b) => {
      let n = 0;
      if (ordem === "notas") n = compararValor(a.nota, b.nota, true);
      if (ordem === "quantidade")
        n = compararValor(a.quantidade, b.quantidade, true);
      return (
        n ||
        compararValor(a.distancia, b.distancia) ||
        normalizar(a.nome).localeCompare(normalizar(b.nome), "pt-BR") ||
        a.chave.localeCompare(b.chave)
      );
    });
  }
  function elegiveis(
    itens,
    { centro, raio, origem = "todos", ordem = "proximos" },
  ) {
    let lista = itens
      .map((e) => ({ ...e, distancia: distancia(centro, e.coordenadas) }))
      .filter(
        (e) =>
          e.distancia != null &&
          e.distancia <= raio + 0.01 &&
          (origem === "todos" || e.origem === origem),
      );
    if (origem === "todos") {
      const proprios = lista.filter((e) => e.origem === "aponte");
      lista = lista.filter(
        (e) =>
          e.origem !== "google" ||
          !proprios.some(
            (p) =>
              normalizar(p.nome) === normalizar(e.nome) &&
              distancia(p.coordenadas, e.coordenadas) < 40,
          ),
      );
    }
    return ordenar(lista, ordem);
  }
  function formatarDistancia(m) {
    return m == null
      ? "Distância indisponível"
      : m < 1000
        ? `${Math.round(m)} m`
        : `${(m / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km`;
  }
  const util = {
    coordenadas,
    distancia,
    limites,
    normalizar,
    ordenar,
    elegiveis,
    formatarDistancia,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = util;
  else raiz.ExploracaoMapa = util;
})(typeof window !== "undefined" ? window : globalThis);
