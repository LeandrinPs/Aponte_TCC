package com.aponte.Service;

import com.aponte.Exception.ConflitoException;
import com.aponte.Exception.FalhaPersistenciaException;
import java.util.function.Supplier;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;

/** Mantém a causa para diagnóstico, sem utilizar mensagens SQL como resposta de negócio. */
final class Persistencia {
  private Persistencia() {}

  static <T> T gravar(Supplier<T> operacao) {
    try {
      return operacao.get();
    } catch (DataIntegrityViolationException e) {
      // Não tenta recuperar entidades dentro de uma transação já marcada para rollback.
      throw new ConflitoException("Os dados conflitam com outro registro ou vínculo existente", e);
    } catch (DataAccessException e) {
      throw new FalhaPersistenciaException(e);
    }
  }

  static void executar(Runnable operacao) {
    gravar(
        () -> {
          operacao.run();
          return null;
        });
  }
}
