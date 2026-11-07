package com.aponte.Repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import com.aponte.Entity.Favoritos;

public interface FavoritosRepository extends JpaRepository<Favoritos, Long> {
    
     List<Favoritos> findByUsuario_Id(Long usuarioId);

    Optional<Favoritos>
        findByUsuario_IdAndEstabelecimento_Id(
            Long usuarioId,
            Long estabelecimentoId
        );

    boolean existsByUsuario_IdAndEstabelecimento_Id(
        Long usuarioId,
        Long estabelecimentoId
    );

    @Transactional
    void deleteByUsuario_IdAndEstabelecimento_Id(
        Long usuarioId,
        Long estabelecimentoId
    );
}