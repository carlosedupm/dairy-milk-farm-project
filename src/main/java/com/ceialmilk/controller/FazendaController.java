package com.ceialmilk.controller;

import com.ceialmilk.model.Fazenda;
import com.ceialmilk.service.FazendaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/fazendas")
@RequiredArgsConstructor
@Slf4j
public class FazendaController {

    private final FazendaService fazendaService;

    /**
     * GET /api/v1/fazendas - Lista todas as fazendas
     */
    @GetMapping
    public Flux<Fazenda> getAllFazendas() {
        log.info("Fetching all fazendas");
        return fazendaService.findAll();
    }

    /**
     * GET /api/v1/fazendas/{id} - Busca uma fazenda por ID
     */
    @GetMapping("/{id}")
    public Mono<Fazenda> getFazendaById(@PathVariable Long id) {
        return fazendaService.findById(id);
    }

    /**
     * POST /api/v1/fazendas - Cria uma nova fazenda
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<Fazenda> createFazenda(@RequestBody Fazenda fazenda) {
        return fazendaService.create(fazenda);
    }

    /**
     * PUT /api/v1/fazendas/{id} - Atualiza uma fazenda existente
     */
    @PutMapping("/{id}")
    public Mono<Fazenda> updateFazenda(@PathVariable Long id, @RequestBody Fazenda fazenda) {
        return fazendaService.update(id, fazenda);
    }

    /**
     * DELETE /api/v1/fazendas/{id} - Deleta uma fazenda
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteFazenda(@PathVariable Long id) {
        return fazendaService.deleteById(id);
    }

    /**
     * GET /api/v1/fazendas/search/by-nome?nome={nome} - Busca fazendas por nome
     */
    @GetMapping("/search/by-nome")
    public Mono<Fazenda> getFazendaByNome(@RequestParam String nome) {
        return fazendaService.findByNome(nome);
    }

    /**
     * GET /api/v1/fazendas/search/by-localizacao?localizacao={localizacao} - Busca fazendas por localização
     */
    @GetMapping("/search/by-localizacao")
    public Flux<Fazenda> getFazendasByLocalizacao(@RequestParam String localizacao) {
        return fazendaService.findByLocalizacao(localizacao);
    }

    /**
     * GET /api/v1/fazendas/search/by-vacas-min?quantidade={quantidade} - Busca fazendas com quantidade mínima de vacas
     */
    @GetMapping("/search/by-vacas-min")
    public Flux<Fazenda> getFazendasByQuantidadeVacasMinima(@RequestParam Integer quantidade) {
        return fazendaService.findByQuantidadeVacasMinima(quantidade);
    }

    /**
     * GET /api/v1/fazendas/search/by-vacas-range?min={min}&max={max} - Busca fazendas com quantidade de vacas entre valores
     */
    @GetMapping("/search/by-vacas-range")
    public Flux<Fazenda> getFazendasByQuantidadeVacasRange(
            @RequestParam Integer min,
            @RequestParam Integer max) {
        return fazendaService.findByQuantidadeVacasRange(min, max);
    }

    /**
     * GET /api/v1/fazendas/count - Retorna o total de fazendas
     */
    @GetMapping("/count")
    public Mono<Long> getFazendasCount() {
        return fazendaService.count();
    }

    /**
     * GET /api/v1/fazendas/exists?nome={nome} - Verifica se uma fazenda com o nome existe
     */
    @GetMapping("/exists")
    public Mono<Boolean> checkFazendaExists(@RequestParam String nome) {
        return fazendaService.existsByNome(nome);
    }
}
