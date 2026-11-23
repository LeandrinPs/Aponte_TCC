package com.aponte;

import static org.assertj.core.api.Assertions.assertThat;

import com.aponte.Entity.Administrador;
import com.aponte.Repository.AdministradorRepository;
import java.nio.file.*;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.*;

/** Execução explícita: mvn -Dtest=ImagensNavegadorIT test; requer Node, Playwright e Chromium. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ImagensNavegadorIT {
  @LocalServerPort int porta;
  @Autowired AdministradorRepository administradores;
  @Autowired PasswordEncoder senhas;
  static final Path ARQUIVOS;

  static {
    try {
      ARQUIVOS = Files.createTempDirectory("aponte-ilustrativas-");
    } catch (java.io.IOException e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  @DynamicPropertySource
  static void arquivosIsolados(DynamicPropertyRegistry r) {
    // Somente armazenamento temporário de uploads do teste; usa o perfil H2 já existente.
    r.add("aponte.uploads.dir", () -> ARQUIVOS.toString());
  }

  @Test
  void fluxoDeImagensComServidorRealEBancoIsolado() throws Exception {
    Administrador admin = new Administrador();
    admin.setNome("ilustrativas-teste");
    admin.setSenhahash(senhas.encode("SenhaIlustrativas123!"));
    administradores.saveAndFlush(admin);
    var registro = Path.of("target", "ilustrativas-browser.log").toAbsolutePath();
    var processo =
        new ProcessBuilder("node", "tests/browser/ilustrativas.cjs", "http://127.0.0.1:" + porta)
            .redirectErrorStream(true)
            .redirectOutput(registro.toFile())
            .start();
    try {
      assertThat(processo.waitFor(180, TimeUnit.SECONDS)).as("Conclusão do navegador").isTrue();
      System.out.println(Files.readString(registro));
      assertThat(processo.exitValue()).as("Assertivas do navegador (" + registro + ")").isZero();
    } finally {
      if (processo.isAlive()) processo.destroyForcibly();
      try (var arquivos = Files.list(ARQUIVOS)) {
        for (var arquivo : arquivos.toList()) Files.deleteIfExists(arquivo);
      }
      Files.deleteIfExists(ARQUIVOS);
    }
  }
}
