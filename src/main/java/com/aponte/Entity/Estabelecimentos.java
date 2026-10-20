package com.aponte.Entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Data;
import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;


@Entity
@Table(name = "estabelecimentos")
@Data
public class Estabelecimentos {
    //ID "id_estabelecimento" é o identificador da entity estabelecimentos
    @Id
    @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
    @Column(name = "id_estabelecimento", unique = true, nullable = false)
    private Long id_estabelecimento;

    @Column(name = "nome", nullable = false, length = 50)
    private String nome;

    @Column(name = "descricao", nullable = false, length = 500)
    private String descricao;

    @Column(name = "endereco", nullable = false, length = 100)
    private String endereco;

    @Column(name  = "latitude", nullable = false, length = 50)
    private String latitude;

    @Column(name = "longitude", nullable = false, length = 50)
    private String longitude;

}
