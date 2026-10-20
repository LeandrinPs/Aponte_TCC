package com.aponte.Entity;

public class Horario {
    //ID "id_horario" é o identificador da entity horario
    @Id
    @GeneratedValue(strategy = jakarta.persistence.GenerationType.IDENTITY)
    @Column(name = "id_horario", unique = true, nullable = false)
    private Long id_horario;

    @ManyToOne
    @JoinColumn(name = "id_estabelecimento", nullable = false)
    private Estabelecimentos estabelecimentos;

    @Enumerated(EnumType.STRING)
    @Column(name = "dia_semana", nullable = false, length = 20)
    private DayOfweek dia_semana;

    @Column(name = "hora_abertura")
    private LocalTime hora_abertura;

    @Column(name = "hora_fechamento")
    private LocalTime hora_fechamento;

}
