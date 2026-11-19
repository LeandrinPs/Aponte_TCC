package com.aponte.DTO;

import com.aponte.Entity.Avaliacao;
import java.time.Instant;

/** Feed público limitado: sem e-mail, IDs pessoais, credenciais ou entidades JPA. */
public record AvaliacaoRecenteDTO(Long id, String autor, String fotoAutorUrl,
    EstabelecimentoDTO estabelecimento, Integer nota, String comentario, Instant criadoEm) {
  public static AvaliacaoRecenteDTO de(Avaliacao a) {
    return new AvaliacaoRecenteDTO(a.getId(), a.getUsuario().getNome(),
        UsuarioDTO.foto(a.getUsuario()), EstabelecimentoDTO.de(a.getEstabelecimento()),
        a.getNota(), a.getComentario(), a.getCriadoEm());
  }
}
