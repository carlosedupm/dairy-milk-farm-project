package com.ceialmilk.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

public record FazendaCreateDTO(
    @NotBlank(message = "Nome é obrigatório")
    String nome,
    
    String localizacao,
    
    @PositiveOrZero(message = "Quantidade de vacas deve ser zero ou positivo")
    Integer quantidadeVacas,
    
    LocalDate fundacao
) {}
