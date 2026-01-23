package com.ceialmilk.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * EnvironmentPostProcessor que converte DATABASE_URL antes de qualquer bean ser criado.
 * Executado muito cedo no ciclo de vida do Spring Boot, antes do Flyway tentar inicializar.
 */
@Slf4j
public class DatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String activeProfile = String.join(",", environment.getActiveProfiles());
        
        // Só processa se o perfil de produção estiver ativo
        if (!activeProfile.contains("prod")) {
            return;
        }

        log.info("=== DatabaseEnvironmentPostProcessor: Processando variáveis de ambiente ===");
        
        String databaseUrl = environment.getProperty("DATABASE_URL");
        
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            log.warn("DATABASE_URL não encontrado. Usando configuração padrão do application-prod.yml");
            return;
        }

        log.info("DATABASE_URL encontrado (mascarado): {}", 
                 databaseUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));

        try {
            Map<String, Object> properties = new HashMap<>();
            String host;
            int port;
            String database;
            String username;
            String password;

            // Processa DATABASE_URL no formato R2DBC
            if (databaseUrl.startsWith("r2dbc:postgresql://")) {
                String urlForParse = databaseUrl.substring(6); // Remove "r2dbc:"
                URI uri = new URI(urlForParse.replace("postgresql://", "http://"));
                host = uri.getHost();
                port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                database = path != null && path.length() > 1 ? path.substring(1) : "ceialmilk";
                
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] credentials = userInfo.split(":", 2);
                    username = credentials[0];
                    password = credentials.length > 1 ? credentials[1] : "";
                } else {
                    username = environment.getProperty("DB_USERNAME", "ceialmilk");
                    password = environment.getProperty("DB_PASSWORD", "");
                }
                
                log.info("Formato R2DBC detectado. Extraído: host={}, port={}, database={}, username={}", 
                         host, port, database, username);
                
                // Configura R2DBC (já está no formato correto)
                properties.put("spring.r2dbc.url", databaseUrl);
                properties.put("spring.r2dbc.username", username);
                properties.put("spring.r2dbc.password", password);
                
            } 
            // Processa DATABASE_URL no formato JDBC ou postgresql://
            else if (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("jdbc:postgresql://")) {
                String urlForParse = databaseUrl.startsWith("jdbc:") 
                    ? databaseUrl.substring(5) 
                    : databaseUrl;
                URI uri = new URI(urlForParse.replace("postgresql://", "http://"));
                host = uri.getHost();
                port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                database = path != null && path.length() > 1 ? path.substring(1) : "ceialmilk";
                
                String userInfo = uri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] credentials = userInfo.split(":", 2);
                    username = credentials[0];
                    password = credentials.length > 1 ? credentials[1] : "";
                } else {
                    username = environment.getProperty("DB_USERNAME", "ceialmilk");
                    password = environment.getProperty("DB_PASSWORD", "");
                }
                
                log.info("Formato JDBC/PostgreSQL detectado. Extraído: host={}, port={}, database={}, username={}", 
                         host, port, database, username);
                
                // Converte para R2DBC
                String r2dbcUrl = String.format("r2dbc:postgresql://%s:%d/%s?sslmode=require", host, port, database);
                properties.put("spring.r2dbc.url", r2dbcUrl);
                properties.put("spring.r2dbc.username", username);
                properties.put("spring.r2dbc.password", password);
            } else {
                log.warn("Formato de DATABASE_URL não reconhecido: {}", 
                         databaseUrl.substring(0, Math.min(50, databaseUrl.length())));
                return;
            }

            // CRÍTICO: Configura Flyway com URL JDBC completa
            String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s?sslmode=require", host, port, database);
            properties.put("spring.flyway.url", jdbcUrl);
            properties.put("spring.flyway.user", username);
            properties.put("spring.flyway.password", password);
            
            // Também define variáveis de ambiente para garantir
            properties.put("FLYWAY_JDBC_URL", jdbcUrl);
            properties.put("FLYWAY_USER", username);
            properties.put("FLYWAY_PASSWORD", password);
            
            // Atualiza DB_HOST com o host completo (importante!)
            properties.put("DB_HOST", host);
            properties.put("DB_PORT", String.valueOf(port));
            properties.put("DB_NAME", database);
            properties.put("DB_USERNAME", username);
            properties.put("DB_PASSWORD", password);
            
            log.info("Configurado Flyway com URL JDBC completa: host={}, port={}, database={}", host, port, database);
            log.info("URL JDBC (mascarada): jdbc:postgresql://{}:{}/{}?sslmode=require", host, port, database);
            
            // Adiciona as propriedades ao ambiente com alta prioridade
            environment.getPropertySources().addFirst(
                new MapPropertySource("database-url-processed", properties)
            );
            
            log.info("=== DatabaseEnvironmentPostProcessor: Configuração concluída com sucesso ===");
            log.info("Total de propriedades configuradas: {}", properties.size());
            
        } catch (Exception e) {
            log.error("ERRO CRÍTICO ao processar DATABASE_URL: {}", e.getMessage(), e);
            throw new RuntimeException("Falha ao processar DATABASE_URL: " + e.getMessage(), e);
        }
    }

    @Override
    public int getOrder() {
        // Ordem alta para executar antes de outros processadores
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
