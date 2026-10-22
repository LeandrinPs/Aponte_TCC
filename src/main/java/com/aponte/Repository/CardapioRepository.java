package com.aponte.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aponte.Entity.Cardapio;

public interface CardapioRepository extends JpaRepository<Cardapio, Long> {
    
}
