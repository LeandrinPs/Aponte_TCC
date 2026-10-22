package com.aponte.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aponte.Entity.Categoria;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    
}
