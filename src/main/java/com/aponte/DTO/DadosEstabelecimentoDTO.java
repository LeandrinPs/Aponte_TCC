package com.aponte.DTO;

import com.aponte.Entity.Estabelecimentos;
import jakarta.validation.constraints.*;

/** Dados fornecidos pelo administrador para um cadastro próprio, nunca uma cópia do Places. */
public record DadosEstabelecimentoDTO(
    @NotBlank @Size(max = 50) String nome,
    @NotBlank @Size(max = 500) String descricao,
    @NotBlank @Size(max = 100) String rua,
    @NotBlank @Size(max = 10) String numero,
    @NotBlank @Size(max = 100) String bairro,
    @NotBlank @Size(max = 100) String cidade,
    @NotBlank @Size(max = 100) String estado,
    @NotBlank @Size(max = 20) String cep,
    @NotBlank @DecimalMin("-90") @DecimalMax("90") @Size(max = 50) String latitude,
    @NotBlank @DecimalMin("-180") @DecimalMax("180") @Size(max = 50) String longitude) {
  public static DadosEstabelecimentoDTO de(Estabelecimentos e) {
    return new DadosEstabelecimentoDTO(
        e.getNome(),
        e.getDescricao(),
        e.getRua(),
        e.getNumero(),
        e.getBairro(),
        e.getCidade(),
        e.getEstado(),
        e.getCep(),
        e.getLatitude(),
        e.getLongitude());
  }

  public void aplicar(Estabelecimentos e) {
    e.setNome(nome.strip());
    e.setDescricao(descricao.strip());
    e.setRua(rua.strip());
    e.setNumero(numero.strip());
    e.setBairro(bairro.strip());
    e.setCidade(cidade.strip());
    e.setEstado(estado.strip());
    e.setCep(cep.strip());
    e.setLatitude(latitude);
    e.setLongitude(longitude);
  }
}
