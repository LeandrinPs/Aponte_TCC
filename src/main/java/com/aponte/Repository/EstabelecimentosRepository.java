package com.aponte.Repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.aponte.Entity.Estabelecimentos;

public interface EstabelecimentosRepository extends JpaRepository<Estabelecimentos, Long> {
    List<Estabelecimentos> findByNomeContainingIgnoreCase(String nome);
}
