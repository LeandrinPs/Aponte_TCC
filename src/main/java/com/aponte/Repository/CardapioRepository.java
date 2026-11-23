package com.aponte.Repository;

import com.aponte.Entity.Cardapio;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardapioRepository extends JpaRepository<Cardapio, Long> {
  long countByEstabelecimento_Id(Long id);

  boolean existsByEstabelecimento_Id(Long estabelecimentoId);

  List<Cardapio> findByEstabelecimento_Id(Long estabelecimentoId);
}
