"use strict";
const senha = document.getElementById("password");
document.getElementById("mostrar-senha")?.addEventListener("click", (e) => {
  senha.type = senha.type === "password" ? "text" : "password";
  e.currentTarget.textContent =
    senha.type === "password" ? "Mostrar" : "Ocultar";
});
document
  .getElementById("cadastro-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const botao = e.target.querySelector("button[type=submit]");
    botao.disabled = true;
    try {
      await Aponte.api("/api/usuarios", {
        method: "POST",
        body: Object.fromEntries(new FormData(e.target)),
      });
      location.href = "/entra.html?cadastrado";
    } catch (erro) {
      Aponte.aviso(erro.message, true, "mensagem-form");
      botao.disabled = false;
    }
  });
