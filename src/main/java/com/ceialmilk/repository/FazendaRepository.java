package com.ceialmilk.repository;

import org.springframework.data.r2dbc.repository.R2dbcRepository;
import org.springframework.stereotype.Repository;

import com.ceialmilk.model.Fazenda;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Repository
public interface FazendaRepository extends R2dbcRepository<Fazenda, Long> {

    /**
     * Busca todas as fazendas ordenadas por ID
     */
    Flux<Fazenda> findAllByOrderById();

    /**
     * Encontra uma fazenda pelo nome (case insensitive)
     */
    Mono<Fazenda> findByNomeIgnoreCase(String nome);

    /**
     * Encontra fazendas pela localização
     */
    Flux<Fazenda> findByLocalizacaoContainingIgnoreCase(String localizacao);

    /**
     * Encontra fazendas com quantidade de vacas maior ou igual ao valor especificado
     */
    Flux<Fazenda> findByQuantidadeVacasGreaterThanEqual(Integer quantidadeVacas);

    /**
     * Encontra fazendas com quantidade de vacas entre os valores especificados
     */
    Flux<Fazenda> findByQuantidadeVacasBetween(Integer min, Integer max);

    /**
     * Verifica se existe uma fazenda com o nome especificado
     */
    Mono<Boolean> existsByNomeIgnoreCase(String nome);
}
