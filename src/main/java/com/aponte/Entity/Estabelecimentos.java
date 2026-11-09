package com.aponte.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "estabelecimentos")
@Data
public class Estabelecimentos {
  // ID "id_estabelecimento" é o identificador da entity estabelecimentos
  @Id
  @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
  @Column(name = "id_estabelecimento", unique = true, nullable = false)
  private Long id;

  // Referências Google persistem somente o identificador externo.
  @Column(name = "google_place_id", length = 255, unique = true)
  private String googlePlaceId;

  @Column(name = "nome", length = 50)
  private String nome;

  @Column(name = "descricao", length = 500)
  private String descricao;

  @Column(name = "rua", length = 100)
  private String rua;

  @Column(name = "numero", length = 10)
  private String numero;

  @Column(name = "bairro", length = 100)
  private String bairro;

  @Column(name = "cidade", length = 100)
  private String cidade;

  @Column(name = "estado", length = 100)
  private String estado;

  @Column(name = "cep", length = 20)
  private String cep;

  @Column(name = "latitude", length = 50)
  private String latitude;

  @Column(name = "longitude", length = 50)
  private String longitude;
}
