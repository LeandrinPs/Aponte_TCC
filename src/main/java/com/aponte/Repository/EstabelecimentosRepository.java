package com.aponte.Repository;

import java.util.List;
import java.util.Optional;
import com.aponte.Entity.Estabelecimentos;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EstabelecimentosRepository extends JpaRepository<Estabelecimentos, Long> {


    List<Estabelecimentos> findByAtivoTrue();

    Optional<Estabelecimentos> findByIdAndAtivoTrue(Long id);

    List<Estabelecimentos> findByNomeContainingIgnoreCaseAndAtivoTrue(String nome);

    List<Estabelecimentos> findByid_categoriaAtivoTrue(String categoria);
}
