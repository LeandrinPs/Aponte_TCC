package com.aponte.Entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity 
@Data 
@Table(name = "adm")
public class Administrador {
    //id_administrador é o identificador da entity administrador
    @Id
    @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
    @Column (name = "id_adm", unique = true, nullable = false)
    private Long id;

    @Column (name = "nome", nullable = false, length = 50)
    private String nome;

    @Column (name = "senhahash", nullable = false, length = 100)
    private String senhahash;
    

}
