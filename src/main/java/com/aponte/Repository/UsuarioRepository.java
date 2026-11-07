package com.aponte.Repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import com.aponte.Entity.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    Boolean existsByEmail(String email);
}
