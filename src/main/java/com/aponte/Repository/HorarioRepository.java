package br.com.projeto.repository;


import br.com.projeto.entity.Horario;
import org.springframework.data.jpa.repository.JpaRepository;

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