package com.ceialmilk.service;

import com.ceialmilk.model.Fazenda;
import com.ceialmilk.repository.FazendaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class FazendaService {

    private final FazendaRepository fazendaRepository;

    /**
     * Busca todas as fazendas
     */
    public Flux<Fazenda> findAll() {
        return fazendaRepository.findAll();
    }

    /**
     * Busca uma fazenda por ID
     */
    public Mono<Fazenda> findById(Long id) {
        return fazendaRepository.findById(id);
    }

    /**
     * Cria uma nova fazenda
     */
    public Mono<Fazenda> create(Fazenda fazenda) {
        return fazendaRepository.save(fazenda);
    }

    /**
     * Atualiza uma fazenda existente
     */
    public Mono<Fazenda> update(Long id, Fazenda fazenda) {
        return fazendaRepository.findById(id)
                .flatMap(existingFazenda -> {
                    existingFazenda.setNome(fazenda.getNome());
                    existingFazenda.setLocalizacao(fazenda.getLocalizacao());
                    existingFazenda.setQuantidadeVacas(fazenda.getQuantidadeVacas());
                    existingFazenda.setFundacao(fazenda.getFundacao());
                    return fazendaRepository.save(existingFazenda);
                });
    }

    /**
     * Deleta uma fazenda por ID
     */
    public Mono<Void> deleteById(Long id) {
        return fazendaRepository.deleteById(id);
    }

    /**
     * Busca fazendas por nome (case insensitive)
     */
    public Mono<Fazenda> findByNome(String nome) {
        return fazendaRepository.findByNomeIgnoreCase(nome);
    }

    /**
     * Busca fazendas por localização
     */
    public Flux<Fazenda> findByLocalizacao(String localizacao) {
        return fazendaRepository.findByLocalizacaoContainingIgnoreCase(localizacao);
    }

    /**
     * Busca fazendas com quantidade mínima de vacas
     */
    public Flux<Fazenda> findByQuantidadeVacasMinima(Integer quantidadeMinima) {
        return fazendaRepository.findByQuantidadeVacasGreaterThanEqual(quantidadeMinima);
    }

    /**
     * Busca fazendas com quantidade de vacas entre os valores especificados
     */
    public Flux<Fazenda> findByQuantidadeVacasRange(Integer min, Integer max) {
        return fazendaRepository.findByQuantidadeVacasBetween(min, max);
    }

    /**
     * Verifica se uma fazenda com o nome já existe
     */
    public Mono<Boolean> existsByNome(String nome) {
        return fazendaRepository.existsByNomeIgnoreCase(nome);
    }

    /**
     * Conta o total de fazendas
     */
    public Mono<Long> count() {
        return fazendaRepository.count();
    }
}
