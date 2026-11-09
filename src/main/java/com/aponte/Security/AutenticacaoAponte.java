package com.aponte.Security;

import com.aponte.Repository.AdministradorRepository;
import com.aponte.Repository.UsuarioRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Login local: e-mail para Usuario; admin:nome para a entidade Administrador separada. */
@Component
@RequiredArgsConstructor
public class AutenticacaoAponte implements UserDetailsService {
  private final UsuarioRepository usuarios;
  private final AdministradorRepository administradores;

  @Override
  @Transactional(readOnly = true)
  public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
    if (login == null || login.isBlank()) throw credenciaisInvalidas();
    String normalizado = login.strip();
    if (normalizado.startsWith("admin:")) {
      var encontrados = administradores.findAllByNome(normalizado.substring(6));
      // Nomes administrativos ambíguos falham de forma fechada, sem escolher uma conta arbitrária.
      if (encontrados.size() != 1) throw credenciaisInvalidas();
      return PrincipalAponte.administrador(encontrados.get(0));
    }
    return usuarios
        .findByEmailIgnoreCase(normalizado.toLowerCase(Locale.ROOT))
        .map(PrincipalAponte::usuario)
        .orElseThrow(AutenticacaoAponte::credenciaisInvalidas);
  }

  private static UsernameNotFoundException credenciaisInvalidas() {
    return new UsernameNotFoundException("Credenciais inválidas");
  }
}
