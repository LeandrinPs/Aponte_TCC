package com.aponte.Repository;

import com.aponte.Entity.Usuario;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
  Optional<Usuario> findByGoogleSub(String googleSub);

  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select u from Usuario u where u.id = :id")
  Optional<Usuario> buscarParaAtualizar(
      @org.springframework.data.repository.query.Param("id") Long id);

  Optional<Usuario> findByEmail(String email);

  Boolean existsByEmail(String email);

  Optional<Usuario> findByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
}
