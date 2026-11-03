package com.aponte.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aponte.Entity.Avaliacao;

public interface AvaliacaoRepository extends JpaRepository<Avaliacao, Long> {
    
    List<Avaliacao>
        findByEstabelecimento_Id(Long estabelecimentoId);

    List<Avaliacao>
        findByUsuario_Id(Long usuarioId);

    Optional<Avaliacao>
        findByUsuario_IdAndEstabelecimento_Id(
            Long usuarioId,
            Long estabelecimentoId
        );

    boolean existsByUsuario_IdAndEstabelecimento_Id(
        Long usuarioId,
        Long estabelecimentoId
    );
}

