package com.aponte.Entity;

import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;



@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "cardapio")
@Data
public class Cardapio {

   @Id
   @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
   @Column(name = "id_cardapio", unique = true, nullable = false)
   private Long id; 

   @ManyToOne
   @JoinColumn(name = "id_estabelecimento", nullable = false)
   private Estabelecimentos estabelecimentos;

   @Column(name = "nome", nullable = false, length = 50)
   private String nome;

    @Column(name = "descricao", nullable = false, length = 500)
    private String descricao;

    @Column(name = "preco", nullable = false, precision = 10, scale = 2)
    private BigDecimal preco;
}
