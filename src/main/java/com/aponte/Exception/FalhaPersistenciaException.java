package com.aponte.Exception;

public class FalhaPersistenciaException extends RuntimeException {
  public FalhaPersistenciaException(Throwable causa) {
    super("Não foi possível concluir a operação de persistência", causa);
  }
}
