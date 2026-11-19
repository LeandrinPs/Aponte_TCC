// Diagnóstico real, sem substituição do SDK e sem desativar a verificação TLS.
const { chromium } = require("playwright");
const fs = require("fs"),
  path = require("path");
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    falhas = [],
    respostas = [];
  const base = process.env.BASE_URL || "http://127.0.0.1:8080";
  const resultado = { tipo: "Google Maps real", tlsVerificado: true };
  const art = path.join(__dirname, "artifacts");
  fs.mkdirSync(art, { recursive: true });
  page.on("requestfailed", (r) => {
    const u = new URL(r.url());
    if (/google|gstatic/.test(u.hostname))
      falhas.push({
        host: u.hostname,
        tipo: r.resourceType(),
        erro: r.failure()?.errorText,
      });
  });
  page.on("response", (r) => {
    const u = new URL(r.url());
    if (/google|gstatic/.test(u.hostname))
      respostas.push({ host: u.hostname, status: r.status() });
  });
  try {
    await page.goto(base + "/map.html", { waitUntil: "domcontentloaded" });
    await page
      .waitForFunction(
        () => !!window.google?.maps?.importLibrary,
        {},
        { timeout: 25000 },
      )
      .catch(() => {});
    resultado.sdkDisponivel = await page.evaluate(
      () => !!window.google?.maps?.importLibrary,
    );
    resultado.mapaIniciado = await page.evaluate(
      () => typeof window.map?.getCenter === "function",
    );
    if (resultado.sdkDisponivel) {
      resultado.places = await page.evaluate(async () => {
        const { Place } = await google.maps.importLibrary("places");
        const { places } = await Place.searchNearby({
          fields: ["id", "displayName", "location", "photos", "primaryType"],
          includedTypes: ["restaurant"],
          maxResultCount: 20,
          locationRestriction: {
            center: { lat: -23.5614, lng: -46.6559 },
            radius: 1000,
          },
        });
        const comFoto = places?.find((p) => p.photos?.length);
        if (!comFoto) return { locais: places?.length || 0, comFoto: 0 };
        await abrirPainel(comFoto);
        const img = document.getElementById("foto-restaurante");
        const carregou = await new Promise((resolve) => {
          if (img.complete) resolve(img.naturalWidth > 0);
          else {
            img.addEventListener("load", () => resolve(img.naturalWidth > 0), {
              once: true,
            });
            img.addEventListener("error", () => resolve(false), { once: true });
            setTimeout(() => resolve(false), 15000);
          }
        });
        return {
          locais: places.length,
          comFoto: places.filter((p) => p.photos?.length).length,
          quantidadeFotos: comFoto.photos.length,
          fotoGoogleCarregada: carregou && img.src.startsWith("https://"),
          autores: comFoto.photos[0].authorAttributions?.length || 0,
        };
      });
    }
    resultado.falhas = falhas;
    resultado.respostas = respostas;
    resultado.resultado =
      resultado.sdkDisponivel && resultado.mapaIniciado
        ? "SDK carregado; conferir resultado das fotografias"
        : "Indisponível no navegador";
    await page.screenshot({
      path: path.join(art, "google-real.png"),
      fullPage: true,
    });
  } catch (e) {
    resultado.erro = e.name;
    resultado.resultado = "Consulta real não concluída";
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(art, "google-real.json"),
      JSON.stringify(resultado, null, 2),
    );
    console.log(JSON.stringify(resultado, null, 2));
    if (!resultado.sdkDisponivel) process.exitCode = 2;
  }
})();
