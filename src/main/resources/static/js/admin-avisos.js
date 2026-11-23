/* Avisos e adiamento de exclusões somente na administração. Não há restauração de dados excluídos. */
"use strict";
window.AdminAvisos = (() => {
  const pendentes = new Map(),
    chaveRetorno = "aponte.admin.retorno",
    chaveCanceladas = "aponte.admin.canceladas",
    chaveEmEnvio = "aponte.admin.em-envio";
  const container = Aponte.el(
    "div",
    "toast-container position-fixed bottom-0 end-0 p-3",
  );
  container.id = "admin-toasts";
  container.setAttribute("aria-live", "polite");
  document.body.append(container);
  function armazenar(chave, valor) {
    try {
      sessionStorage.setItem(chave, String(valor));
    } catch {}
  }
  function ler(chave) {
    try {
      const v = sessionStorage.getItem(chave);
      sessionStorage.removeItem(chave);
      return v;
    } catch {
      return null;
    }
  }
  function aviso(mensagem, erro = false, acao = null) {
    if (!mensagem) return null;
    if (/Failed to fetch|NetworkError|Load failed/i.test(mensagem))
      mensagem =
        "Não foi possível comunicar com o servidor. Confira a conexão e tente novamente.";
    const toast = Aponte.el(
      "div",
      "toast admin-toast " + (erro ? "toast-erro" : ""),
    );
    toast.setAttribute("role", erro ? "alert" : "status");
    toast.setAttribute("aria-atomic", "true");
    const body = Aponte.el("div", "toast-body"),
      titulo = Aponte.el(
        "strong",
        "d-block mb-1",
        acao
          ? "Exclusão agendada"
          : erro
            ? "Não foi possível concluir"
            : "Aponte",
      );
    const texto = Aponte.el("div", "", mensagem);
    body.append(titulo, texto);
    if (acao) {
      const undo = Aponte.el(
        "button",
        "btn btn-sm btn-outline-danger mt-3",
        "Desfazer",
      );
      undo.type = "button";
      undo.onclick = acao;
      body.append(undo);
      body.append(
        Aponte.el(
          "small",
          "d-block mt-2 text-secondary",
          "Se sair ou recarregar a página, a exclusão pendente será cancelada.",
        ),
      );
    } else {
      const fechar = Aponte.el("button", "btn-close admin-toast-fechar");
      fechar.type = "button";
      fechar.setAttribute("aria-label", "Fechar aviso");
      fechar.dataset.bsDismiss = "toast";
      body.append(fechar);
    }
    toast.append(body);
    container.append(toast);
    const instance = new bootstrap.Toast(toast, {
      autohide: !acao,
      delay: erro ? 9000 : 6000,
    });
    toast.addEventListener(
      "hidden.bs.toast",
      () => {
        instance.dispose();
        toast.remove();
      },
      { once: true },
    );
    instance.show();
    return { toast, body, texto, instance };
  }
  function linhas(chave) {
    return [...document.querySelectorAll("[data-exclusao]")].filter(
      (n) => n.dataset.exclusao === chave,
    );
  }
  function marcar(chave, ativo, texto = "Exclusão agendada…") {
    for (const tr of linhas(chave)) {
      tr.classList.toggle("exclusao-pendente", ativo);
      for (const b of tr.querySelectorAll("button")) b.disabled = ativo;
      for (const a of tr.querySelectorAll("a")) {
        if (ativo) {
          a.setAttribute("aria-disabled", "true");
          a.tabIndex = -1;
        } else {
          a.removeAttribute("aria-disabled");
          a.removeAttribute("tabindex");
        }
      }
      tr.querySelector(".exclusao-estado")?.remove();
      if (ativo) {
        const estado = Aponte.el("span", "exclusao-estado small", texto);
        estado.setAttribute("role", "status");
        tr.querySelector("td")?.append(estado);
      }
    }
  }
  function aplicar() {
    for (const [chave, p] of pendentes)
      marcar(
        chave,
        true,
        p.status === "verificando"
          ? "Verificando exclusão…"
          : p.status === "enviando"
            ? "Excluindo…"
            : "Exclusão agendada…",
      );
  }
  function cancelar(chave, informar = true) {
    const p = pendentes.get(chave);
    if (!p || p.status === "enviando") return false;
    clearTimeout(p.timer);
    pendentes.delete(chave);
    p.aviso?.instance.hide();
    marcar(chave, false);
    if (informar) aviso("Exclusão cancelada. Nenhum dado foi removido.");
    return true;
  }
  async function agendar({
    chave,
    verificar,
    executar,
    atualizar,
    confirmacao,
    descricao = "Registro",
  }) {
    if (pendentes.has(chave)) return;
    const p = { status: "verificando" };
    pendentes.set(chave, p);
    marcar(chave, true, "Verificando exclusão…");
    try {
      const estado = await verificar();
      if (pendentes.get(chave) !== p) return;
      if (!estado.permitida) {
        cancelar(chave, false);
        aviso(estado.mensagem, true);
        return;
      }
      if (!confirm(confirmacao + "\n\n" + estado.mensagem)) {
        cancelar(chave, false);
        return;
      }
      p.status = "pendente";
      p.aviso = aviso(
        descricao +
          ": a operação será enviada em 7 segundos. Nenhum dado foi excluído ainda.",
        false,
        () => cancelar(chave),
      );
      p.aviso.toast.dataset.exclusaoChave = chave;
      marcar(chave, true);
      p.timer = setTimeout(async () => {
        if (pendentes.get(chave) !== p || p.status !== "pendente") return;
        p.status = "enviando";
        p.aviso.body.querySelector("button").disabled = true;
        p.aviso.texto.textContent =
          "Excluindo… Aguardando confirmação do servidor.";
        marcar(chave, true, "Excluindo…");
        let concluida = false;
        try {
          await executar();
          concluida = true;
          for (const tr of linhas(chave)) tr.remove();
          aviso("Exclusão concluída.");
        } catch (e) {
          aviso(e.message, true);
        } finally {
          pendentes.delete(chave);
          p.aviso.instance.hide();
          marcar(chave, false);
          try {
            await atualizar();
          } catch {
            aviso(
              concluida
                ? "A exclusão foi concluída, mas não foi possível atualizar a lista. Recarregue para conferir."
                : "Não foi possível atualizar a lista. Recarregue para conferir o estado real.",
              true,
            );
          }
        }
      }, 7000);
    } catch (e) {
      cancelar(chave, false);
      aviso(e.message, true);
    }
  }
  window.addEventListener("pagehide", () => {
    let canceladas = 0,
      enviando = 0;
    for (const [chave, p] of [...pendentes]) {
      if (p.status === "enviando") enviando++;
      else if (cancelar(chave, false)) canceladas++;
    }
    if (canceladas) armazenar(chaveCanceladas, canceladas);
    if (enviando) armazenar(chaveEmEnvio, enviando);
  });
  function retornar() {
    const n = ler(chaveCanceladas),
      e = ler(chaveEmEnvio),
      msg = ler(chaveRetorno);
    if (n)
      aviso(
        `${n} exclusão(ões) pendente(s) foram canceladas ao sair ou recarregar a página.`,
      );
    if (e)
      aviso(
        "Havia uma exclusão em envio ao sair. Confira a tabela para confirmar o resultado; operações já enviadas não podem ser desfeitas.",
        true,
      );
    if (msg) aviso(msg);
  }
  window.addEventListener("pageshow", retornar);
  const original = Aponte.aviso;
  Aponte.aviso = (mensagem, erro = false, alvo = "admin-status") => {
    if (alvo !== "admin-status") return original(mensagem, erro, alvo);
    const status = document.getElementById("admin-status");
    if (status) status.textContent = "";
    if (mensagem?.startsWith("Carregando")) {
      if (status) status.textContent = mensagem;
      return;
    }
    return aviso(mensagem, erro);
  };
  return {
    mostrar: aviso,
    agendar,
    aplicar,
    aoRetornar: (msg) => armazenar(chaveRetorno, msg),
  };
})();
