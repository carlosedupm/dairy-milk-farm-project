package com.ceialmilk.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.lang.NonNull;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;

/**
 * Configuração do R2DBC para produção.
 * Converte DATABASE_URL do formato JDBC (postgresql://) para R2DBC (r2dbc:postgresql://)
 * quando necessário.
 */
@Slf4j
@Configuration
@Profile("prod")
public class R2dbcConfig implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    @Override
    public void onApplicationEvent(@NonNull ApplicationEnvironmentPreparedEvent event) {
        ConfigurableEnvironment environment = event.getEnvironment();
        String databaseUrl = environment.getProperty("DATABASE_URL");
        String r2dbcUrl = environment.getProperty("spring.r2dbc.url");
        String r2dbcUrlEnv = environment.getProperty("R2DBC_URL");

        // Se já existe R2DBC_URL ou spring.r2dbc.url configurado, não faz nada
        if (r2dbcUrl != null && !r2dbcUrl.isEmpty() && !r2dbcUrl.contains("${")) {
            log.debug("R2DBC URL já configurado: {}", r2dbcUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
            return;
        }

        if (r2dbcUrlEnv != null && !r2dbcUrlEnv.isEmpty()) {
            log.debug("R2DBC_URL já configurado via variável de ambiente");
            return;
        }

        // Se DATABASE_URL está no formato postgresql:// (com ou sem jdbc:), converte para R2DBC e JDBC
        if (databaseUrl != null && (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("jdbc:postgresql://"))) {
            try {
                // Remove o prefixo jdbc: se existir para fazer o parse
                String urlForParse = databaseUrl.startsWith("jdbc:") 
                    ? databaseUrl.substring(5) // Remove "jdbc:"
                    : databaseUrl;
                // Parse do DATABASE_URL no formato: postgresql://user:pass@host:port/dbname
                URI uri = new URI(urlForParse.replace("postgresql://", "http://"));
                String host = uri.getHost();
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                String database = path != null && path.length() > 1 ? path.substring(1) : "ceialmilk";
                
                // Extrai user:pass do userInfo
                String userInfo = uri.getUserInfo();
                String username = environment.getProperty("DB_USERNAME", "ceialmilk");
                String password = environment.getProperty("DB_PASSWORD", "");
                
                if (userInfo != null && userInfo.contains(":")) {
                    String[] credentials = userInfo.split(":", 2);
                    username = credentials[0];
                    password = credentials.length > 1 ? credentials[1] : "";
                }
                
                // Constrói a URL R2DBC
                String convertedUrl = String.format("r2dbc:postgresql://%s:%d/%s?sslmode=require", host, port, database);
                
                log.info("Convertido DATABASE_URL de JDBC para R2DBC: host={}, port={}, database={}", 
                         host, port, database);
                
                // Adiciona as propriedades ao ambiente
                Map<String, Object> properties = new HashMap<>();
                properties.put("spring.r2dbc.url", convertedUrl);
                properties.put("spring.r2dbc.username", username);
                properties.put("spring.r2dbc.password", password);
                
                // Sempre configura o Flyway quando DATABASE_URL está presente
                // Flyway precisa de URL no formato JDBC (jdbc:postgresql://)
                // Converte postgresql:// para jdbc:postgresql://
                String jdbcUrl = databaseUrl.startsWith("jdbc:") 
                    ? databaseUrl 
                    : databaseUrl.replace("postgresql://", "jdbc:postgresql://");
                properties.put("spring.flyway.url", jdbcUrl);
                properties.put("spring.flyway.user", username);
                properties.put("spring.flyway.password", password);
                log.info("Configurado Flyway com URL JDBC: host={}, port={}, database={}", host, port, database);
                
                // Atualiza variáveis DB_* se não estiverem definidas
                String dbHost = environment.getProperty("DB_HOST");
                if (dbHost == null || dbHost.isEmpty()) {
                    properties.put("DB_HOST", host);
                }
                String dbPort = environment.getProperty("DB_PORT");
                if (dbPort == null || dbPort.isEmpty()) {
                    properties.put("DB_PORT", String.valueOf(port));
                }
                String dbName = environment.getProperty("DB_NAME");
                if (dbName == null || dbName.isEmpty()) {
                    properties.put("DB_NAME", database);
                }
                String dbUsername = environment.getProperty("DB_USERNAME");
                if (dbUsername == null || dbUsername.isEmpty()) {
                    properties.put("DB_USERNAME", username);
                }
                String dbPassword = environment.getProperty("DB_PASSWORD");
                if (dbPassword == null || dbPassword.isEmpty()) {
                    properties.put("DB_PASSWORD", password);
                }
                
                environment.getPropertySources().addFirst(
                    new MapPropertySource("r2dbc-converted-properties", properties)
                );
                
                log.info("Propriedades R2DBC configuradas a partir do DATABASE_URL");
            } catch (Exception e) {
                log.warn("Erro ao converter DATABASE_URL para R2DBC: {}. Usando configuração padrão.", e.getMessage());
            }
        } else if (databaseUrl == null || databaseUrl.isEmpty()) {
            log.info("DATABASE_URL não configurado. Usando variáveis DB_HOST, DB_NAME, etc. do application-prod.yml");
        } else {
            log.warn("DATABASE_URL em formato desconhecido: {}. Tentando usar configuração padrão.", 
                     databaseUrl.substring(0, Math.min(50, databaseUrl.length())));
        }
    }
}
