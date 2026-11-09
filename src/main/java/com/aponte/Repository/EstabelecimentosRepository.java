package com.aponte.Repository;

import com.aponte.Entity.Estabelecimentos;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstabelecimentosRepository extends JpaRepository<Estabelecimentos, Long> {
  List<Estabelecimentos> findByNomeContainingIgnoreCase(String nome);

  Optional<Estabelecimentos> findByGooglePlaceId(String googlePlaceId);

  boolean existsByGooglePlaceId(String googlePlaceId);
}
