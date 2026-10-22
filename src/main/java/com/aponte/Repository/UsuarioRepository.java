package com.aponte.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aponte.Entity.Usuario;

public class UsuarioRepository {
    

    public interface UsuarioRepositoy extends JpaRepository <Usuario, Long> {
    
        Optional<Usuario> findByEmail(String email);

        Boolean existsByEmail(String email);
    }
}


//git config --global user.name 
//git config --global user.email 