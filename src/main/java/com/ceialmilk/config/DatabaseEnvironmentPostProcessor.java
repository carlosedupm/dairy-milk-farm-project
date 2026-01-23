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
        // Log sempre, independente do perfil, para debug
        String activeProfile = String.join(",", environment.getActiveProfiles());
        System.out.println("=== DatabaseEnvironmentPostProcessor: INICIADO (System.out) ===");
        System.out.println("Perfis ativos: " + (activeProfile.isEmpty() ? "nenhum" : activeProfile));
        log.info("=== DatabaseEnvironmentPostProcessor: Iniciado ===");
        log.info("Perfis ativos: {}", activeProfile.isEmpty() ? "nenhum" : activeProfile);
        
        String springProfilesActive = environment.getProperty("SPRING_PROFILES_ACTIVE");
        System.out.println("SPRING_PROFILES_ACTIVE: " + springProfilesActive);
        log.info("SPRING_PROFILES_ACTIVE: {}", springProfilesActive);
        
        // Verifica se o perfil prod está ativo (pode estar vindo de SPRING_PROFILES_ACTIVE)
        boolean isProdProfile = activeProfile.contains("prod") || 
                                (springProfilesActive != null && springProfilesActive.contains("prod"));
        System.out.println("isProdProfile: " + isProdProfile);
        
        // Se não for prod, mas DATABASE_URL estiver presente, processa mesmo assim (pode ser produção sem perfil explícito)
        String databaseUrl = environment.getProperty("DATABASE_URL");
        boolean hasDatabaseUrl = databaseUrl != null && !databaseUrl.isEmpty();
        System.out.println("hasDatabaseUrl: " + hasDatabaseUrl);
        
        if (!isProdProfile && !hasDatabaseUrl) {
            System.out.println("RETORNANDO: Perfil de produção não detectado e DATABASE_URL não presente.");
            log.info("Perfil de produção não detectado e DATABASE_URL não presente. Pulando processamento.");
            return;
        }
        
        if (!isProdProfile && hasDatabaseUrl) {
            System.out.println("AVISO: DATABASE_URL presente mas perfil prod não detectado. Processando mesmo assim.");
            log.warn("DATABASE_URL presente mas perfil prod não detectado. Processando mesmo assim (pode ser produção).");
        }
        
        System.out.println("CONTINUANDO: Vai processar DATABASE_URL ou usar fallback");

        log.info("=== DatabaseEnvironmentPostProcessor: Processando variáveis de ambiente ===");
        log.info("DATABASE_URL presente: {}", databaseUrl != null && !databaseUrl.isEmpty());
        
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            log.error("ERRO: DATABASE_URL não encontrado! Verifique as variáveis de ambiente no Render.");
            log.warn("Tentando usar variáveis DB_HOST, DB_NAME, etc. como fallback");
            
            // Fallback: tenta construir a partir de variáveis separadas
            String dbHost = environment.getProperty("DB_HOST");
            String dbPort = environment.getProperty("DB_PORT", "5432");
            String dbName = environment.getProperty("DB_NAME", "ceialmilk");
            String dbUsername = environment.getProperty("DB_USERNAME", "ceialmilk");
            String dbPassword = environment.getProperty("DB_PASSWORD");
            
            if (dbHost != null && !dbHost.isEmpty() && dbPassword != null && !dbPassword.isEmpty()) {
                log.info("Usando variáveis separadas: host={}, port={}, database={}", dbHost, dbPort, dbName);
                
                Map<String, Object> properties = new HashMap<>();
                String jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s?sslmode=require&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory", 
                                             dbHost, dbPort, dbName);
                // R2DBC: Remove credenciais da URL e usa propriedades separadas
                String r2dbcUrl = String.format("r2dbc:postgresql://%s:%s/%s?sslmode=require", dbHost, dbPort, dbName);
                
                properties.put("spring.flyway.url", jdbcUrl);
                properties.put("spring.flyway.user", dbUsername);
                properties.put("spring.flyway.password", dbPassword);
                properties.put("spring.r2dbc.url", r2dbcUrl);
                properties.put("spring.r2dbc.username", dbUsername);
                properties.put("spring.r2dbc.password", dbPassword);
                
                System.out.println("Fallback - R2DBC URL configurada (sem credenciais na URL): " + r2dbcUrl);
                
                environment.getPropertySources().addFirst(
                    new MapPropertySource("database-fallback", properties)
                );
                
                System.out.println("Configuração de fallback aplicada com sucesso");
                log.info("Configuração de fallback aplicada com sucesso");
                return;
            } else {
                System.out.println("ERRO: Variáveis DB_HOST ou DB_PASSWORD não encontradas!");
                log.error("Variáveis DB_HOST ou DB_PASSWORD não encontradas. Não é possível configurar o banco.");
                throw new RuntimeException("DATABASE_URL ou variáveis DB_HOST/DB_PASSWORD devem estar configuradas");
            }
        }

        // Se chegou aqui, DATABASE_URL está presente
        if (databaseUrl != null && !databaseUrl.isEmpty()) {
            String maskedUrl = databaseUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@");
            System.out.println("DATABASE_URL encontrado (mascarado): " + maskedUrl);
            log.info("DATABASE_URL encontrado (mascarado): {}", maskedUrl);
        }

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
                System.out.println("Credenciais extraídas - Username: " + username + ", Password length: " + 
                                 (password != null ? password.length() : 0));
                
                // Configura R2DBC
                // IMPORTANTE: Remove credenciais da URL e usa propriedades separadas
                // R2DBC pode ter problemas com credenciais na URL, especialmente com SSL
                String r2dbcUrlFinal = String.format("r2dbc:postgresql://%s:%d/%s?sslmode=require", host, port, database);
                properties.put("spring.r2dbc.url", r2dbcUrlFinal);
                properties.put("spring.r2dbc.username", username);
                properties.put("spring.r2dbc.password", password);
                
                System.out.println("R2DBC URL configurada (sem credenciais na URL): " + r2dbcUrlFinal);
                System.out.println("R2DBC Username: " + username);
                System.out.println("R2DBC Password presente: " + (password != null && !password.isEmpty()));
                
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
                // IMPORTANTE: Remove credenciais da URL e usa propriedades separadas
                // R2DBC pode ter problemas com credenciais na URL, especialmente com SSL
                String r2dbcUrl = String.format("r2dbc:postgresql://%s:%d/%s?sslmode=require", host, port, database);
                properties.put("spring.r2dbc.url", r2dbcUrl);
                properties.put("spring.r2dbc.username", username);
                properties.put("spring.r2dbc.password", password);
                
                System.out.println("R2DBC URL configurada (sem credenciais na URL): " + r2dbcUrl);
                System.out.println("R2DBC Username: " + username);
                System.out.println("R2DBC Password presente: " + (password != null && !password.isEmpty()));
            } else {
                log.warn("Formato de DATABASE_URL não reconhecido: {}", 
                         databaseUrl.substring(0, Math.min(50, databaseUrl.length())));
                return;
            }

            // CRÍTICO: Configura Flyway com URL JDBC completa
            // Render PostgreSQL REQUER sslmode=require (obrigatório)
            // Adiciona parâmetros SSL explícitos para garantir conexão segura
            String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s?sslmode=require&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory", 
                                         host, port, database);
            properties.put("spring.flyway.url", jdbcUrl);
            properties.put("spring.flyway.user", username);
            properties.put("spring.flyway.password", password);
            
            System.out.println("URL JDBC configurada: " + jdbcUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
            System.out.println("Username: " + username);
            System.out.println("Password presente: " + (password != null && !password.isEmpty()));
            System.out.println("SSL configurado: sslmode=require, ssl=true");
            
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
            
            System.out.println("Configurado Flyway com URL JDBC completa: host=" + host + ", port=" + port + ", database=" + database);
            log.info("Configurado Flyway com URL JDBC completa: host={}, port={}, database={}", host, port, database);
            log.info("URL JDBC (mascarada): jdbc:postgresql://{}:{}/{}?sslmode=require", host, port, database);
            
            // Adiciona as propriedades ao ambiente com alta prioridade
            environment.getPropertySources().addFirst(
                new MapPropertySource("database-url-processed", properties)
            );
            
            System.out.println("=== DatabaseEnvironmentPostProcessor: Configuração concluída com sucesso ===");
            System.out.println("Total de propriedades configuradas: " + properties.size());
            log.info("=== DatabaseEnvironmentPostProcessor: Configuração concluída com sucesso ===");
            log.info("Total de propriedades configuradas: {}", properties.size());
            
            // Verifica se as propriedades foram realmente aplicadas
            String flywayUrlAfter = environment.getProperty("spring.flyway.url");
            String r2dbcUrlAfter = environment.getProperty("spring.r2dbc.url");
            String r2dbcUsernameAfter = environment.getProperty("spring.r2dbc.username");
            
            System.out.println("Verificação: spring.flyway.url após configuração = " + 
                             (flywayUrlAfter != null ? flywayUrlAfter.replaceAll("://[^:]+:[^@]+@", "://***:***@") : "NULL"));
            System.out.println("Verificação: spring.r2dbc.url após configuração = " + 
                             (r2dbcUrlAfter != null ? r2dbcUrlAfter : "NULL"));
            System.out.println("Verificação: spring.r2dbc.username após configuração = " + 
                             (r2dbcUsernameAfter != null ? r2dbcUsernameAfter : "NULL"));
            
            log.info("Verificação: spring.flyway.url após configuração = {}", 
                    flywayUrlAfter != null ? flywayUrlAfter.replaceAll("://[^:]+:[^@]+@", "://***:***@") : "NULL");
            log.info("Verificação: spring.r2dbc.url após configuração = {}", r2dbcUrlAfter);
            log.info("Verificação: spring.r2dbc.username após configuração = {}", r2dbcUsernameAfter);
            
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
