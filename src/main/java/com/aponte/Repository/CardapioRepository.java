package com.aponte.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import com.aponte.Entity.Cardapio;

public interface CardapioRepository extends JpaRepository<Cardapio, Long> {
    
    List<Cardapio>
        findByEstabelecimento_IdAndDisponivelTrue(Long estabelecimentoId);

    List<Cardapio>
        findByEstabelecimento_Id(Long estabelecimentoId);
}
