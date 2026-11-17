package com.aponte.Repository;

import com.aponte.Entity.Estabelecimentos;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EstabelecimentosRepository extends JpaRepository<Estabelecimentos, Long> {
  List<Estabelecimentos> findByGooglePlaceIdIsNull();

  long countByGooglePlaceIdIsNull();

  long countByGooglePlaceIdIsNotNull();

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from Estabelecimentos e where e.id = :id")
  Optional<Estabelecimentos> buscarParaAtualizar(@Param("id") Long id);

  List<Estabelecimentos> findByNomeContainingIgnoreCase(String nome);

  Optional<Estabelecimentos> findByGooglePlaceId(String googlePlaceId);

  boolean existsByGooglePlaceId(String googlePlaceId);
}
