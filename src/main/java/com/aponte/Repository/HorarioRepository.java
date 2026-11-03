package com.aponte.Repository;


import org.springframework.data.jpa.repository.JpaRepository;

import com.aponte.Entity.Horario;

import java.util.List;
import java.util.Optional;
import java.time.DayOfWeek;
import java.util.List;

public interface HorarioRepository
        extends JpaRepository<Horario, Long> {

    List<Horario>
        findByEstabelecimento_Id(Long estabelecimentoId);

    List<Horario>
        findByEstabelecimento_IdAndDiaSemana(
            Long estabelecimentoId,
            DayOfWeek diaSemana
        );
}