package com.ceialmilk.controller;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.RestController;

import com.ceialmilk.dto.FazendaCreateDTO;
import com.ceialmilk.dto.FazendaResponseDTO;
import com.ceialmilk.dto.FazendaSummaryDTO;
import com.ceialmilk.dto.FazendaUpdateDTO;
import com.ceialmilk.model.Fazenda;
import com.ceialmilk.service.FazendaService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/fazendas")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fazendas", description = "Operações relacionadas a fazendas leiteiras")
@SecurityRequirement(name = "bearerAuth")
public class FazendaController {

    private final FazendaService fazendaService;

    /**
     * GET /api/v1/fazendas - Lista todas as fazendas
     */
    @GetMapping
    @Operation(summary = "Listar todas as fazendas", 
               description = "Retorna uma lista paginada de todas as fazendas cadastradas")
    public Mono<Page<FazendaSummaryDTO>> getAllFazendas(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        log.info("Fetching all fazendas with pagination, page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        return fazendaService.findAll(pageable);
    }

    /**
     * GET /api/v1/fazendas/{id} - Busca uma fazenda por ID
     */
    @GetMapping("/{id}")
    @Operation(summary = "Buscar fazenda por ID", 
               description = "Retorna os detalhes de uma fazenda específica")
    public Mono<FazendaResponseDTO> getFazendaById(
            @Parameter(description = "ID da fazenda", required = true)
            @PathVariable Long id) {
        return fazendaService.findById(id);
    }

    /**
     * POST /api/v1/fazendas - Cria uma nova fazenda
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Criar nova fazenda", 
               description = "Cadastra uma nova fazenda no sistema")
    public Mono<FazendaResponseDTO> createFazenda(
            @Parameter(description = "Dados da fazenda", required = true)
            @Valid @RequestBody FazendaCreateDTO dto) {
        return fazendaService.create(dto);
    }

    /**
     * PUT /api/v1/fazendas/{id} - Atualiza uma fazenda existente
     */
    @PutMapping("/{id}")
    @Operation(summary = "Atualizar fazenda", 
               description = "Atualiza os dados de uma fazenda existente")
    public Mono<FazendaResponseDTO> updateFazenda(
            @Parameter(description = "ID da fazenda", required = true)
            @PathVariable Long id,
            @Parameter(description = "Dados atualizados da fazenda", required = true)
            @Valid @RequestBody FazendaUpdateDTO dto) {
        return fazendaService.update(id, dto);
    }

    /**
     * DELETE /api/v1/fazendas/{id} - Deleta uma fazenda
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Excluir fazenda", 
               description = "Remove uma fazenda do sistema")
    public Mono<Void> deleteFazenda(
            @Parameter(description = "ID da fazenda", required = true)
            @PathVariable Long id) {
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
