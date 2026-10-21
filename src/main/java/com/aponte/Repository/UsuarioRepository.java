package com.aponte.Repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.aponte.Entity.Usuario;

public class UsuarioRepository {
    

    public interface UsuarioRepositoy extends JpaRepository <Usuario, Long> {
    
        
    }
}


//git config --global user.name 
//git config --global user.email 