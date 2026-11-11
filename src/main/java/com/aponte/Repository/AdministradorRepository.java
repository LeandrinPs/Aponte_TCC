package com.aponte.Repository;

import com.aponte.Entity.Administrador;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdministradorRepository extends JpaRepository<Administrador, Long> {
  List<Administrador> findAllByNome(String nome);
}
