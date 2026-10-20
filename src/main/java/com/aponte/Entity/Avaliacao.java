package com.aponte.Entity;

@Entity
@Table(name = "avaliacao")
@Data
public class Avaliacao {
    //ID "id_avaliacao" é o identificador da entity avaliacao
    @Id
    @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
    @Column(name = "id_avaliacao", unique = true, nullable = false)
    private Long id_avaliacao;

    @ManyToOne
    @JoinColumn(name = "id_user", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "id_estabelecimento", nullable = false)
    private Estabelecimentos estabelecimentos;

    @Column(name = "nota", nullable = false)
    private Integer nota;
    
}
