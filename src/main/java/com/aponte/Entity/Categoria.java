package com.aponte.Entity;


@Entity
@Table(name = "categoria")
@Data
public class Categoria {
    //ID "id_categoria" é o identificador da entity categoria
    @Id
    @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
    @Column(name = "id_categoria", unique = true, nullable = false)
    private Long id_categoria;

    @Column(name = "nome", nullable = false, length = 50)
    private String nome;
}
