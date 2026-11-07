package com.aponte.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.aponte.Entity.Cardapio;

public interface CardapioRepository extends JpaRepository<Cardapio, Long> {
    List<Cardapio> findByEstabelecimento_Id(Long estabelecimentoId);
}
