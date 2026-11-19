package com.aponte.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "usuario")
@Data
public class Usuario {
  /* id_user é o identificador da entity usuario */
  @Id
  @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
  @Column(name = "id_user", unique = true, nullable = false)
  private Long id;

  @Column(name = "nome", nullable = false, length = 50)
  private String nome;

  @Column(name = "email", nullable = false, length = 50, unique = true)
  private String email;

@Column(name = "cidade", length = 100)
private String cidade;

@Column(name = "estado", length = 2)
private String estado;

  @Column(name = "foto_perfil", length = 100)
  private String fotoPerfil;

  @Column(name = "criado_em")
  private java.time.Instant criadoEm;

  @lombok.ToString.Exclude
  @Column(name = "google_sub", length = 255, unique = true)
  @com.fasterxml.jackson.annotation.JsonIgnore
  private String googleSub;

  @jakarta.persistence.PrePersist
  void registrarCriacao() {
    if (criadoEm == null) criadoEm = java.time.Instant.now();
  }

  @lombok.ToString.Exclude
  @lombok.EqualsAndHashCode.Exclude
  @com.fasterxml.jackson.annotation.JsonIgnore
  @Column(name = "senha", length = 100)
  private String senha;
}
