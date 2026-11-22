package com.aponte.Repository;

import com.aponte.Entity.Avaliacao;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AvaliacaoRepository extends JpaRepository<Avaliacao, Long> {
  @Query(
      "select a from Avaliacao a join fetch a.usuario join fetch a.estabelecimento "
          + "order by case when a.criadoEm is null then 1 else 0 end, a.criadoEm desc, a.id desc")
  List<Avaliacao> buscarRecentes(org.springframework.data.domain.Pageable pagina);

  @Query(
      "select new com.aponte.DTO.ResumoEstabelecimentoDTO(a.estabelecimento.id, count(a),"
          + " avg(a.nota)) from Avaliacao a where a.estabelecimento.googlePlaceId is null group by"
          + " a.estabelecimento.id")
  List<com.aponte.DTO.ResumoEstabelecimentoDTO> resumirProprios();

  long countByUsuario_Id(Long usuarioId);

  boolean existsByEstabelecimento_Id(Long estabelecimentoId);

  long countByEstabelecimento_Id(Long estabelecimentoId);

  void deleteByUsuario_Id(Long usuarioId);

  @Query("select avg(a.nota) from Avaliacao a where a.estabelecimento.id = :id")
  Double calcularMediaPorEstabelecimento(@Param("id") Long estabelecimentoId);

  List<Avaliacao> findByEstabelecimento_Id(Long estabelecimentoId);

  List<Avaliacao> findByUsuario_Id(Long usuarioId);

  Optional<Avaliacao> findByUsuario_IdAndEstabelecimento_Id(Long usuarioId, Long estabelecimentoId);

  boolean existsByUsuario_IdAndEstabelecimento_Id(Long usuarioId, Long estabelecimentoId);
}
