package com.aponte.Entity;

@Entity
@Table(name = "cardapio")
@Data
public class Cardapio {

   @Id
   @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
   @Column(name = "id_cardapio", unique = true, nullable = false)
   private Long id_cardapio; 

   @ManyToOne
   @JoinColumn(name = "id_estabelecimento", nullable = false)
   private Estabelecimentos estabelecimentos;

   @Column(name = "nome", nullable = false, length = 50)
   private String nome;

    @Column(name = "descricao", nullable = false, length = 500)
    private String descricao;

    @Column(name = "preco", nullable = false, precision = 10, scale = 2)
    @Positive(message = "O preço deve ser um valor positivo.")
    private BigDecimal preco;
}
