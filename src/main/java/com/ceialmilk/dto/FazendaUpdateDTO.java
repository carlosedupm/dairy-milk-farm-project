package com.ceialmilk.dto;

import java.time.LocalDate;
import java.util.Optional;

public record FazendaUpdateDTO(
    Optional<String> nome,
    Optional<String> localizacao,
    Optional<Integer> quantidadeVacas,
    Optional<LocalDate> fundacao
) {}
