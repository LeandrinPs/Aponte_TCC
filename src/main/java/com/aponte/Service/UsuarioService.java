package com.aponte.Service;

import com.aponte.DTO.*;
import com.aponte.Entity.Usuario;
import com.aponte.Exception.*;
import com.aponte.Repository.*;
import com.aponte.Security.AcessoAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

@Service
@Validated
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioService {
  private final UsuarioRepository usuarios;
  private final FavoritosRepository favoritos;
  private final AvaliacaoRepository avaliacoes;
  private final PasswordEncoder senhas;
  private final AcessoAtual acesso;

  @Transactional
  public UsuarioDTO cadastrar(@NotNull @Valid UsuarioCadastroDTO dados) {
    validarTamanhoSenha(dados.senha());
    String email = normalizarEmail(dados.email());
    if (usuarios.existsByEmailIgnoreCase(email))
      throw new ConflitoException("E-mail já cadastrado");
    Usuario usuario = new Usuario();
    usuario.setNome(dados.nome().strip());
    usuario.setEmail(email);
    usuario.setSenha(senhas.encode(dados.senha()));
    return UsuarioDTO.de(Persistencia.gravar(() -> usuarios.saveAndFlush(usuario)));
  }

  public UsuarioDTO buscarPorId(@NotNull @Positive Long id) {
    acesso.exigirProprioOuAdministrador(id);
    return UsuarioDTO.de(exigirExistente(id));
  }

  public UsuarioDTO buscarMeuPerfil() {
    return UsuarioDTO.de(exigirExistente(acesso.usuarioId()));
  }

  public UsuarioDTO buscarPorEmail(@NotBlank @Email @Size(max = 50) String email) {
    acesso.exigirAdministrador();
    return UsuarioDTO.de(
        usuarios
            .findByEmailIgnoreCase(normalizarEmail(email))
            .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado")));
  }

  public List<UsuarioDTO> listar() {
    acesso.exigirAdministrador();
    return usuarios.findAll().stream().map(UsuarioDTO::de).toList();
  }

  public boolean existeEmail(@NotBlank @Email @Size(max = 50) String email) {
    acesso.exigirAdministrador();
    return usuarios.existsByEmailIgnoreCase(normalizarEmail(email));
  }

  @Transactional
  public UsuarioDTO atualizarMeuPerfil(@NotNull @Valid UsuarioAtualizacaoDTO dados) {
    return atualizar(exigirExistente(acesso.usuarioId()), dados);
  }

  @Transactional
  public UsuarioDTO atualizarComoAdministrador(
      @NotNull @Positive Long id, @NotNull @Valid UsuarioAtualizacaoDTO dados) {
    acesso.exigirAdministrador();
    return atualizar(exigirExistente(id), dados);
  }

  @Transactional
  public void alterarMinhaSenha(
      @NotBlank String senhaAtual, @NotBlank @Size(min = 8, max = 72) String novaSenha) {
    Usuario usuario = exigirExistente(acesso.usuarioId());
    if (!senhas.matches(senhaAtual, usuario.getSenha())) {
      throw new AccessDeniedException("Senha atual incorreta");
    }
    validarTamanhoSenha(novaSenha);
    usuario.setSenha(senhas.encode(novaSenha));
    Persistencia.gravar(() -> usuarios.saveAndFlush(usuario));
  }

  @Transactional
  public void excluir(@NotNull @Positive Long id) {
    acesso.exigirAdministrador();
    Usuario usuario = exigirExistente(id);
    Persistencia.executar(
        () -> {
          favoritos.deleteByUsuario_Id(id);
          avaliacoes.deleteByUsuario_Id(id);
          usuarios.delete(usuario);
          usuarios.flush();
        });
  }

  private UsuarioDTO atualizar(Usuario usuario, UsuarioAtualizacaoDTO dados) {
    String email = normalizarEmail(dados.email());
    if (usuarios.existsByEmailIgnoreCaseAndIdNot(email, usuario.getId())) {
      throw new ConflitoException("E-mail já cadastrado");
    }
    usuario.setNome(dados.nome().strip());
    usuario.setEmail(email);
    return UsuarioDTO.de(Persistencia.gravar(() -> usuarios.saveAndFlush(usuario)));
  }

  private Usuario exigirExistente(Long id) {
    return usuarios
        .findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Usuário não encontrado"));
  }

  private static String normalizarEmail(String email) {
    return email.strip().toLowerCase(Locale.ROOT);
  }

  private static void validarTamanhoSenha(String senha) {
    if (senha.getBytes(StandardCharsets.UTF_8).length > 72) {
      throw new IllegalArgumentException("A senha deve ter no máximo 72 bytes em UTF-8");
    }
  }
}
