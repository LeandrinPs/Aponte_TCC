package com.aponte.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aponte.Entity.Avaliacao;

public interface AvaliacaoRepository extends JpaRepository<Avaliacao, Long> {
    
}
