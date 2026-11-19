"use strict";
const senha = document.getElementById("password"),
  confirmacao = document.getElementById("confirmacao-senha");
document.getElementById("mostrar-senha")?.addEventListener("click", (e) => {
  const visivel = senha.type === "password";
  senha.type = visivel ? "text" : "password";
  e.currentTarget.setAttribute("aria-pressed", String(visivel));
  e.currentTarget.setAttribute(
    "aria-label",
    visivel ? "Ocultar senha" : "Mostrar senha",
  );
  e.currentTarget.querySelector("i").className = visivel
    ? "bi bi-eye-slash"
    : "bi bi-eye";
});
function confirmar() {
  confirmacao?.setCustomValidity(
    confirmacao.value !== senha.value ? "As senhas devem ser iguais" : "",
  );
}
senha?.addEventListener("input", confirmar);
confirmacao?.addEventListener("input", confirmar);
document
  .getElementById("cadastro-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    confirmar();
    if (!e.target.reportValidity()) return;
    const botao = e.target.querySelector("button[type=submit]");
    Aponte.ocupado(botao, true, "Criando conta…");
    try {
      await Aponte.api("/api/usuarios", {
        method: "POST",
        body: Object.fromEntries(new FormData(e.target)),
      });
      location.href = "/entra.html?cadastrado";
    } catch (erro) {
      Aponte.aviso(erro.message, true, "mensagem-form");
      Aponte.ocupado(botao, false);
    }
  });
document.getElementById("login-form")?.addEventListener("submit", (e) => {
  if (e.target.checkValidity())
    Aponte.ocupado(
      e.target.querySelector("button[type=submit]"),
      true,
      "Entrando…",
    );
});
