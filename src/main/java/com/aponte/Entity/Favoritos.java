package com.aponte.Entity;

@Entity
@Table(name = "favoritos")
@Data
public class Favoritos {
    //ID "id_favorito" é o identificador da entity favoritos
    @Id
    @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
    @Column(name = "id_favorito", unique = true, nullable = false)
    private Long id_favorito;

    @ManyToOne
    @JoinColumn(name = "id_user", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "id_estabelecimento", nullable = false)
    private Estabelecimentos estabelecimentos;
    
}
