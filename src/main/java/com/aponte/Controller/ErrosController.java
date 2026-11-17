package com.aponte.Controller;

import com.aponte.Exception.*;
import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice(basePackages = "com.aponte.Controller")
public class ErrosController {
  private ResponseEntity<Map<String, String>> erro(HttpStatus status, String mensagem) {
    return ResponseEntity.status(status).body(Map.of("mensagem", mensagem));
  }

  @ExceptionHandler(RecursoNaoEncontradoException.class)
  ResponseEntity<?> ausente(RecursoNaoEncontradoException e) {
    return erro(HttpStatus.NOT_FOUND, e.getMessage());
  }

  @ExceptionHandler(ConflitoException.class)
  ResponseEntity<?> conflito(ConflitoException e) {
    return erro(HttpStatus.CONFLICT, e.getMessage());
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<?> proibido() {
    return erro(HttpStatus.FORBIDDEN, "Você não tem permissão para esta operação");
  }

  @ExceptionHandler(AuthenticationException.class)
  ResponseEntity<?> login() {
    return erro(HttpStatus.UNAUTHORIZED, "Entre na sua conta para continuar");
  }

  @ExceptionHandler({
    ConstraintViolationException.class,
    HandlerMethodValidationException.class,
    MethodArgumentTypeMismatchException.class,
    HttpMessageNotReadableException.class
  })
  ResponseEntity<?> validacao() {
    return erro(HttpStatus.BAD_REQUEST, "Confira os campos e os identificadores informados");
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> campos(MethodArgumentNotValidException e) {
    String msg =
        e.getBindingResult().getFieldErrors().stream()
            .map(f -> f.getField() + ": " + f.getDefaultMessage())
            .distinct()
            .sorted()
            .collect(java.util.stream.Collectors.joining("; "));
    return erro(HttpStatus.BAD_REQUEST, msg.isBlank() ? "Confira os campos informados" : msg);
  }

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<?> dados(IllegalArgumentException e) {
    return erro(HttpStatus.BAD_REQUEST, e.getMessage());
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<?> tamanho() {
    return erro(HttpStatus.PAYLOAD_TOO_LARGE, "A fotografia deve ter até 5 MB");
  }

  @ExceptionHandler({FalhaPersistenciaException.class, DataAccessException.class})
  ResponseEntity<?> banco() {
    return erro(
        HttpStatus.SERVICE_UNAVAILABLE,
        "Não foi possível concluir a operação. Tente novamente mais tarde");
  }
}
