package com.ceialmilk.service;

import org.springframework.stereotype.Service;

import com.ceialmilk.dto.FazendaCreateDTO;
import com.ceialmilk.dto.FazendaResponseDTO;
import com.ceialmilk.dto.FazendaSummaryDTO;
import com.ceialmilk.dto.FazendaUpdateDTO;
import com.ceialmilk.mapper.FazendaMapper;
import com.ceialmilk.model.Fazenda;
import com.ceialmilk.repository.FazendaRepository;

import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
@RequiredArgsConstructor
public class FazendaService {

    private final FazendaRepository fazendaRepository;

    /**
     * Busca todas as fazendas
     */
    public Flux<FazendaSummaryDTO> findAll() {
        return fazendaRepository.findAll()
                .map(fazendaMapper::toSummaryDTO);
    }

    private final FazendaMapper fazendaMapper;

    /**
     * Busca uma fazenda por ID
     */
    public Mono<FazendaResponseDTO> findById(Long id) {
        return fazendaRepository.findById(id)
                .map(fazendaMapper::toResponseDTO);
    }

    /**
     * Cria uma nova fazenda
     */
    public Mono<Fazenda> create(Fazenda fazenda) {
        return fazendaRepository.save(fazenda);
    }

    /**
     * Cria uma nova fazenda a partir de DTO
     */
    public Mono<FazendaResponseDTO> create(FazendaCreateDTO dto) {
        return Mono.just(dto)
                .map(fazendaMapper::toEntity)
                .flatMap(fazendaRepository::save)
                .map(fazendaMapper::toResponseDTO);
    }

    /**
     * Atualiza uma fazenda existente
     */
    public Mono<FazendaResponseDTO> update(Long id, FazendaUpdateDTO dto) {
        return fazendaRepository.findById(id)
                .flatMap(existing -> {
                    // Aplica apenas os campos que foram fornecidos
                    dto.nome().filter(nome -> !nome.isBlank()).ifPresent(existing::setNome);
                    dto.localizacao().filter(local -> local != null).ifPresent(existing::setLocalizacao);
                    dto.quantidadeVacas().filter(qtd -> qtd >= 0).ifPresent(existing::setQuantidadeVacas);
                    dto.fundacao().filter(data -> data != null).ifPresent(existing::setFundacao);
                    
                    return fazendaRepository.save(existing)
                           .map(fazendaMapper::toResponseDTO);
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
