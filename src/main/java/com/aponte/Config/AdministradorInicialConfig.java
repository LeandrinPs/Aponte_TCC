package com.aponte.Config;

import com.aponte.Entity.Administrador;
import com.aponte.Repository.AdministradorRepository;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdministradorInicialConfig {
  @Bean
  @ConditionalOnProperty(name = "aponte.admin.bootstrap.enabled", havingValue = "true")
  ApplicationRunner administradorInicial(
      AdministradorRepository repo,
      PasswordEncoder encoder,
      @Value("${aponte.admin.bootstrap.nome:}") String nome,
      @Value("${aponte.admin.bootstrap.senha:}") String senha) {
    return args -> {
      if (nome.isBlank()
          || nome.length() > 50
          || senha.length() < 12
          || senha.getBytes(StandardCharsets.UTF_8).length > 72) {
        throw new IllegalStateException(
            "Configure nome e senha administrativa de pelo menos 12 caracteres, até 72 bytes");
      }
      if (!repo.findAllByNome(nome).isEmpty()) return; // Nunca redefine uma senha existente.
      var admin = new Administrador();
      admin.setNome(nome);
      admin.setSenhahash(encoder.encode(senha));
      repo.saveAndFlush(admin);
    };
  }
}
