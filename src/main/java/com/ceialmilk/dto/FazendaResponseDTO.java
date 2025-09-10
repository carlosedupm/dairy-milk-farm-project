package com.ceialmilk.dto;

import java.time.LocalDate;

public record FazendaResponseDTO(
    Long id,
    String nome,
    String localizacao,
    Integer quantidadeVacas,
    LocalDate fundacao
) {}
