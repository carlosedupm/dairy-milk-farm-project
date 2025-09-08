package com.ceialmilk.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.relational.core.mapping.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("fazendas")
public class Fazenda {

    @Id
    private Long id;

    private String nome;

    private String localizacao;

    private Integer quantidadeVacas;

    private LocalDate fundacao;

    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Construtor para criação sem ID
    public Fazenda(String nome, String localizacao, Integer quantidadeVacas, LocalDate fundacao) {
        this.nome = nome;
        this.localizacao = localizacao;
        this.quantidadeVacas = quantidadeVacas;
        this.fundacao = fundacao;
    }
}
