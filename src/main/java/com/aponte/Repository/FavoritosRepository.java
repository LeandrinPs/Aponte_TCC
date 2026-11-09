package com.aponte.Repository;

import com.aponte.Entity.Favoritos;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

public interface FavoritosRepository extends JpaRepository<Favoritos, Long> {
  boolean existsByEstabelecimento_Id(Long estabelecimentoId);

  void deleteByUsuario_Id(Long usuarioId);

  List<Favoritos> findByUsuario_Id(Long usuarioId);

  Optional<Favoritos> findByUsuario_IdAndEstabelecimento_Id(Long usuarioId, Long estabelecimentoId);

  boolean existsByUsuario_IdAndEstabelecimento_Id(Long usuarioId, Long estabelecimentoId);

  @Transactional
  void deleteByUsuario_IdAndEstabelecimento_Id(Long usuarioId, Long estabelecimentoId);
}
