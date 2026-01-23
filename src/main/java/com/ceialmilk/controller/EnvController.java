package com.ceialmilk.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller para verificar variáveis de ambiente (útil para debug em produção).
 * NUNCA expõe senhas ou informações sensíveis.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/env")
@RequiredArgsConstructor
public class EnvController {

    private final Environment environment;

    @GetMapping("/check")
    public Mono<ResponseEntity<Map<String, Object>>> checkEnvironment() {
        Map<String, Object> envInfo = new HashMap<>();
        
        // Informações do banco (sem senhas)
        String databaseUrl = environment.getProperty("DATABASE_URL");
        envInfo.put("DATABASE_URL_present", databaseUrl != null && !databaseUrl.isEmpty());
        if (databaseUrl != null && !databaseUrl.isEmpty()) {
            envInfo.put("DATABASE_URL_format", 
                databaseUrl.startsWith("r2dbc:") ? "R2DBC" : 
                databaseUrl.startsWith("jdbc:") ? "JDBC" : 
                databaseUrl.startsWith("postgresql://") ? "PostgreSQL" : "Desconhecido");
            // Mascara a URL removendo credenciais
            String maskedUrl = databaseUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@");
            envInfo.put("DATABASE_URL_masked", maskedUrl);
        }
        
        envInfo.put("DB_HOST", environment.getProperty("DB_HOST"));
        envInfo.put("DB_PORT", environment.getProperty("DB_PORT"));
        envInfo.put("DB_NAME", environment.getProperty("DB_NAME"));
        envInfo.put("DB_USERNAME", environment.getProperty("DB_USERNAME"));
        envInfo.put("DB_PASSWORD_present", environment.getProperty("DB_PASSWORD") != null);
        
        // Configurações Spring
        envInfo.put("SPRING_PROFILES_ACTIVE", environment.getProperty("SPRING_PROFILES_ACTIVE"));
        envInfo.put("spring.r2dbc.url_present", environment.getProperty("spring.r2dbc.url") != null);
        envInfo.put("spring.flyway.url_present", environment.getProperty("spring.flyway.url") != null);
        
        // Mascara a URL do R2DBC se presente
        String r2dbcUrl = environment.getProperty("spring.r2dbc.url");
        if (r2dbcUrl != null && !r2dbcUrl.isEmpty()) {
            envInfo.put("spring.r2dbc.url_masked", r2dbcUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
        }
        
        // Mascara a URL do Flyway se presente
        String flywayUrl = environment.getProperty("spring.flyway.url");
        if (flywayUrl != null && !flywayUrl.isEmpty()) {
            envInfo.put("spring.flyway.url_masked", flywayUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
        }
        
        return Mono.just(ResponseEntity.ok(envInfo));
    }
}
