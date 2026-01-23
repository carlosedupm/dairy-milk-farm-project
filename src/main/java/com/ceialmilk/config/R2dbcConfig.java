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
        log.info("=== R2dbcConfig: Iniciando processamento de variáveis de ambiente ===");
        ConfigurableEnvironment environment = event.getEnvironment();
        String databaseUrl = environment.getProperty("DATABASE_URL");
        String r2dbcUrl = environment.getProperty("spring.r2dbc.url");
        String r2dbcUrlEnv = environment.getProperty("R2DBC_URL");

        // Log das variáveis de ambiente para debug (sem expor senhas)
        log.info("=== Configuração de Banco de Dados ===");
        log.info("DATABASE_URL presente: {}", databaseUrl != null && !databaseUrl.isEmpty());
        if (databaseUrl != null && !databaseUrl.isEmpty()) {
            String maskedUrl = databaseUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@");
            log.info("DATABASE_URL (mascarado): {}", maskedUrl);
            log.info("DATABASE_URL formato: {}", 
                databaseUrl.startsWith("r2dbc:") ? "R2DBC" : 
                databaseUrl.startsWith("jdbc:") ? "JDBC" : 
                databaseUrl.startsWith("postgresql://") ? "PostgreSQL" : "Desconhecido");
        }
        log.info("DB_HOST: {}", environment.getProperty("DB_HOST"));
        log.info("DB_PORT: {}", environment.getProperty("DB_PORT"));
        log.info("DB_NAME: {}", environment.getProperty("DB_NAME"));
        log.info("DB_USERNAME: {}", environment.getProperty("DB_USERNAME"));
        log.info("DB_PASSWORD presente: {}", environment.getProperty("DB_PASSWORD") != null);

        // Se já existe R2DBC_URL ou spring.r2dbc.url configurado, não faz nada
        if (r2dbcUrl != null && !r2dbcUrl.isEmpty() && !r2dbcUrl.contains("${")) {
            log.debug("R2DBC URL já configurado: {}", r2dbcUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
            return;
        }

        if (r2dbcUrlEnv != null && !r2dbcUrlEnv.isEmpty()) {
            log.debug("R2DBC_URL já configurado via variável de ambiente");
            return;
        }

        // Se DATABASE_URL está no formato R2DBC (r2dbc:postgresql://), extrai informações
        if (databaseUrl != null && databaseUrl.startsWith("r2dbc:postgresql://")) {
            try {
                // Remove o prefixo r2dbc: para fazer o parse
                String urlForParse = databaseUrl.substring(6); // Remove "r2dbc:"
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
                
                log.info("Extraído do DATABASE_URL (R2DBC): host={}, port={}, database={}, username={}", 
                         host, port, database, username);
                
                // Adiciona as propriedades ao ambiente
                Map<String, Object> properties = new HashMap<>();
                properties.put("spring.r2dbc.url", databaseUrl); // Já está no formato R2DBC
                properties.put("spring.r2dbc.username", username);
                properties.put("spring.r2dbc.password", password);
                
                // Flyway precisa de URL no formato JDBC (jdbc:postgresql://)
                String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s?sslmode=require", host, port, database);
                properties.put("spring.flyway.url", jdbcUrl);
                properties.put("spring.flyway.user", username);
                properties.put("spring.flyway.password", password);
                // Também define variáveis de ambiente para garantir que sejam usadas
                properties.put("FLYWAY_JDBC_URL", jdbcUrl);
                properties.put("FLYWAY_USER", username);
                properties.put("FLYWAY_PASSWORD", password);
                log.info("Configurado Flyway com URL JDBC: host={}, port={}, database={}", host, port, database);
                log.info("URL JDBC completa (mascarada): jdbc:postgresql://{}:{}/{}?sslmode=require", 
                         host, port, database);
                
                // Sempre atualiza DB_HOST com o host completo (importante para conexão)
                properties.put("DB_HOST", host);
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
                
                log.info("Propriedades R2DBC e Flyway configuradas a partir do DATABASE_URL (formato R2DBC)");
                log.info("Total de propriedades configuradas: {}", properties.size());
                log.info("Propriedades configuradas: spring.r2dbc.url, spring.r2dbc.username, spring.r2dbc.password, spring.flyway.url, spring.flyway.user, spring.flyway.password, DB_HOST");
            } catch (Exception e) {
                log.error("Erro ao processar DATABASE_URL no formato R2DBC: {}", e.getMessage(), e);
            }
        }
        // Se DATABASE_URL está no formato postgresql:// (com ou sem jdbc:), converte para R2DBC e JDBC
        else if (databaseUrl != null && (databaseUrl.startsWith("postgresql://") || databaseUrl.startsWith("jdbc:postgresql://"))) {
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
                // Também define variáveis de ambiente para garantir que sejam usadas
                properties.put("FLYWAY_JDBC_URL", jdbcUrl);
                properties.put("FLYWAY_USER", username);
                properties.put("FLYWAY_PASSWORD", password);
                log.info("Configurado Flyway com URL JDBC: host={}, port={}, database={}", host, port, database);
                log.info("URL JDBC completa (mascarada): {}", jdbcUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
                
                // Sempre atualiza DB_HOST com o host completo (importante para conexão)
                // Isso garante que mesmo se DB_HOST estiver incompleto, será corrigido
                properties.put("DB_HOST", host);
                String dbPort = environment.getProperty("DB_PORT");
                if (dbPort == null || dbPort.length() == 0) {
                    properties.put("DB_PORT", String.valueOf(port));
                }
                String dbName = environment.getProperty("DB_NAME");
                if (dbName == null || dbName.length() == 0) {
                    properties.put("DB_NAME", database);
                }
                String dbUsername = environment.getProperty("DB_USERNAME");
                if (dbUsername == null || dbUsername.length() == 0) {
                    properties.put("DB_USERNAME", username);
                }
                String dbPassword = environment.getProperty("DB_PASSWORD");
                if (dbPassword == null || dbPassword.length() == 0) {
                    properties.put("DB_PASSWORD", password);
                }
                
                environment.getPropertySources().addFirst(
                    new MapPropertySource("r2dbc-converted-properties", properties)
                );
                
                log.info("Propriedades R2DBC configuradas a partir do DATABASE_URL");
                log.info("Total de propriedades configuradas: {}", properties.size());
                log.info("Propriedades configuradas: spring.r2dbc.url, spring.r2dbc.username, spring.r2dbc.password, spring.flyway.url, spring.flyway.user, spring.flyway.password, DB_HOST");
            } catch (Exception e) {
                log.error("Erro ao converter DATABASE_URL para R2DBC: {}. Usando configuração padrão.", e.getMessage(), e);
            }
        } else if (databaseUrl == null || databaseUrl.isEmpty()) {
            log.warn("DATABASE_URL não configurado. Usando variáveis DB_HOST, DB_NAME, etc. do application-prod.yml");
            log.warn("ATENÇÃO: Se DB_HOST estiver incompleto, a conexão pode falhar!");
        } else {
            log.warn("DATABASE_URL em formato desconhecido: {}. Tentando usar configuração padrão.", 
                     databaseUrl.substring(0, Math.min(50, databaseUrl.length())));
        }
        
        // Log final de confirmação
        String finalFlywayUrl = environment.getProperty("spring.flyway.url");
        if (finalFlywayUrl != null && !finalFlywayUrl.isEmpty()) {
            String maskedUrl = finalFlywayUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@");
            log.info("=== R2dbcConfig: Configuração finalizada ===");
            log.info("Flyway URL configurada: {}", maskedUrl);
        } else {
            log.warn("=== R2dbcConfig: ATENÇÃO - spring.flyway.url não foi configurada! ===");
        }
    }
}
