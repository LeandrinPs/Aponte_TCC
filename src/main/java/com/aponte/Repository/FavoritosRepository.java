package com.aponte.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aponte.Entity.Favoritos;

public interface FavoritosRepository extends JpaRepository<Favoritos, Long> {
    
    List<Favoritos> findByAtivotrue ();


    Optional<Favoritos> findByIdandAtivoTrue(Long id);

    List<Favoritos> findByNomeContainingIgnoreCaseAndAtivoTrue(String nome);

    List<Favoritos>findById_CategoriaAndAtivoTrue(Long id_categoria);
}