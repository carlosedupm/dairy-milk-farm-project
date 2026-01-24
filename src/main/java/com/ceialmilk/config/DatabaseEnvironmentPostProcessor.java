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
        
        // PRIORIDADE 1: Tenta usar variáveis individuais (mais confiável)
        // MAS: Se DB_HOST não tiver domínio completo, extrai do DATABASE_URL
        String dbHost = environment.getProperty("DB_HOST");
        String dbPort = environment.getProperty("DB_PORT", "5432");
        String dbName = environment.getProperty("DB_NAME", "ceialmilk");
        String dbUsername = environment.getProperty("DB_USERNAME", "ceialmilk");
        String dbPassword = environment.getProperty("DB_PASSWORD");
        
        // Só anexar sufixo externo se USE_EXTERNAL_DB_HOST=true (ex.: conexão de fora do Render).
        // Padrão: usar host interno (curto) como na DATABASE_URL.
        if ("true".equalsIgnoreCase(environment.getProperty("USE_EXTERNAL_DB_HOST"))
                && dbHost != null && !dbHost.isEmpty() && !dbHost.contains(".")) {
            String suffix = environment.getProperty("DB_HOST_SUFFIX", ".oregon-postgres.render.com");
            dbHost = dbHost + suffix;
            System.out.println("USE_EXTERNAL_DB_HOST=true; usando host externo: " + dbHost);
            log.info("Host externo: {}", dbHost);
        }

        // Se temos todas as variáveis individuais (com host completo), usa elas diretamente
        if (dbHost != null && !dbHost.isEmpty() && dbPassword != null && !dbPassword.isEmpty()) {
            System.out.println("=== Usando variáveis individuais (DB_HOST, DB_PORT, etc.) ===");
            System.out.println("DB_HOST completo: " + dbHost);
            log.info("Usando variáveis individuais: host={}, port={}, database={}", dbHost, dbPort, dbName);
            
            Map<String, Object> properties = new HashMap<>();
            
            // Constrói URL JDBC completamente separada para Flyway
            String jdbcUrl = String.format("jdbc:postgresql://%s:%s/%s?sslmode=prefer&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory&connectTimeout=10&socketTimeout=30&tcpKeepAlive=true", 
                                         dbHost, dbPort, dbName);
            
            // Constrói URL R2DBC completamente separada (NUNCA compartilha base com JDBC)
            String r2dbcUrl = String.format("r2dbc:postgresql://%s:%s/%s?sslMode=require", dbHost, dbPort, dbName);
            
            // Configura Flyway (JDBC)
            properties.put("spring.flyway.url", jdbcUrl);
            properties.put("spring.flyway.user", dbUsername);
            properties.put("spring.flyway.password", dbPassword);
            
            // Configura R2DBC (separado, independente)
            properties.put("spring.r2dbc.url", r2dbcUrl);
            properties.put("spring.r2dbc.username", dbUsername);
            properties.put("spring.r2dbc.password", dbPassword);
            
            // Também define variáveis auxiliares
            properties.put("FLYWAY_JDBC_URL", jdbcUrl);
            properties.put("FLYWAY_USER", dbUsername);
            properties.put("FLYWAY_PASSWORD", dbPassword);
            properties.put("R2DBC_URL", r2dbcUrl);
            
            System.out.println("JDBC URL (Flyway): " + jdbcUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
            System.out.println("R2DBC URL (aplicação): " + r2dbcUrl);
            System.out.println("URLs construídas de forma completamente independente");
            
            environment.getPropertySources().addFirst(
                new MapPropertySource("database-from-individual-vars", properties)
            );
            
            System.out.println("Configuração aplicada com sucesso usando variáveis individuais");
            log.info("Configuração aplicada com sucesso usando variáveis individuais");
            return;
        }
        
        // PRIORIDADE 2: Se não temos variáveis individuais, usa DATABASE_URL apenas para extrair informações
        if (databaseUrl == null || databaseUrl.isEmpty()) {
            System.out.println("ERRO: Nem DATABASE_URL nem variáveis individuais encontradas!");
            log.error("ERRO: DATABASE_URL não encontrado e variáveis individuais incompletas!");
            log.error("Variáveis encontradas: DB_HOST={}, DB_PASSWORD presente={}", 
                     dbHost != null ? "SIM" : "NÃO", 
                     dbPassword != null && !dbPassword.isEmpty() ? "SIM" : "NÃO");
            throw new RuntimeException("DATABASE_URL ou variáveis DB_HOST/DB_PASSWORD devem estar configuradas");
        }

        // Se chegou aqui, vamos usar DATABASE_URL apenas para extrair informações
        // e construir URLs completamente separadas para R2DBC e JDBC
        if (databaseUrl != null && !databaseUrl.isEmpty()) {
            String maskedUrl = databaseUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@");
            System.out.println("=== Usando DATABASE_URL apenas para extrair informações ===");
            System.out.println("DATABASE_URL encontrado (mascarado): " + maskedUrl);
            log.info("DATABASE_URL encontrado (mascarado): {}", maskedUrl);
            log.info("Usando DATABASE_URL apenas para extrair informações, construindo URLs separadas");
        }

        try {
            Map<String, Object> properties = new HashMap<>();
            String host;
            int port;
            String database;
            String username;
            String password;
            
            // Prioriza usar variáveis individuais do ambiente quando disponíveis
            String envHost = environment.getProperty("DB_HOST");
            String envPort = environment.getProperty("DB_PORT");
            String envDatabase = environment.getProperty("DB_NAME");
            String envUsername = environment.getProperty("DB_USERNAME");
            String envPassword = environment.getProperty("DB_PASSWORD");

            // Extrai informações do DATABASE_URL (qualquer formato)
            String urlForParse = databaseUrl;
            if (databaseUrl.startsWith("r2dbc:postgresql://")) {
                urlForParse = databaseUrl.substring(6); // Remove "r2dbc:"
            } else if (databaseUrl.startsWith("jdbc:postgresql://")) {
                urlForParse = databaseUrl.substring(5); // Remove "jdbc:"
            }
            
            URI uri = new URI(urlForParse.replace("postgresql://", "http://"));
            
            // Usa variáveis do ambiente se disponíveis E tiverem domínio completo, senão extrai do DATABASE_URL
            String extractedHost = uri.getHost();
            // CRÍTICO: Só usa envHost se tiver domínio completo (contém ponto), senão usa o extraído do DATABASE_URL
            if (envHost != null && !envHost.isEmpty() && envHost.contains(".")) {
                host = envHost;
                System.out.println("Usando DB_HOST do ambiente (com domínio completo): " + host);
            } else {
                host = extractedHost;
                if (envHost != null && !envHost.isEmpty()) {
                    System.out.println("DB_HOST do ambiente não tem domínio completo (" + envHost + "). Usando host extraído do DATABASE_URL: " + host);
                    log.warn("DB_HOST do ambiente ({}) não tem domínio completo. Usando host extraído do DATABASE_URL: {}", envHost, host);
                } else {
                    System.out.println("DB_HOST não disponível. Usando host extraído do DATABASE_URL: " + host);
                }
            }
            port = envPort != null && !envPort.isEmpty() ? Integer.parseInt(envPort) : (uri.getPort() > 0 ? uri.getPort() : 5432);
            String path = uri.getPath();
            database = envDatabase != null && !envDatabase.isEmpty() ? envDatabase : 
                      (path != null && path.length() > 1 ? path.substring(1) : "ceialmilk");
            
            // Prioriza sempre usar credenciais do ambiente
            String userInfo = uri.getUserInfo();
            if (userInfo != null && userInfo.contains(":")) {
                String[] credentials = userInfo.split(":", 2);
                username = envUsername != null && !envUsername.isEmpty() ? envUsername : credentials[0];
                password = envPassword != null && !envPassword.isEmpty() ? envPassword : 
                          (credentials.length > 1 ? credentials[1] : "");
            } else {
                username = envUsername != null && !envUsername.isEmpty() ? envUsername : "ceialmilk";
                password = envPassword != null && !envPassword.isEmpty() ? envPassword : "";
            }
            
            log.info("Informações extraídas: host={}, port={}, database={}, username={}", 
                     host, port, database, username);
            System.out.println("Usando variáveis do ambiente - Host: " + (envHost != null ? "SIM" : "NÃO") + 
                             ", Port: " + (envPort != null ? "SIM" : "NÃO") + 
                             ", Database: " + (envDatabase != null ? "SIM" : "NÃO") +
                             ", Username: " + (envUsername != null ? "SIM" : "NÃO") +
                             ", Password: " + (envPassword != null ? "SIM" : "NÃO"));
            System.out.println("Credenciais finais - Username: " + username + ", Password length: " + 
                             (password != null ? password.length() : 0));
            
            // Só anexar sufixo externo se USE_EXTERNAL_DB_HOST=true. Padrão: host interno.
            if ("true".equalsIgnoreCase(environment.getProperty("USE_EXTERNAL_DB_HOST"))
                    && host != null && !host.contains(".")) {
                String suffix = environment.getProperty("DB_HOST_SUFFIX", ".oregon-postgres.render.com");
                host = host + suffix;
                System.out.println("USE_EXTERNAL_DB_HOST=true; usando host externo: " + host);
                log.info("Host externo: {}", host);
            }
            if (host == null || host.isEmpty()) {
                throw new RuntimeException("Host do banco de dados não pôde ser determinado");
            }
            System.out.println("Host: " + host);
            
            // URL JDBC para Flyway (completamente independente)
            String jdbcUrl = String.format("jdbc:postgresql://%s:%d/%s?sslmode=prefer&ssl=true&sslfactory=org.postgresql.ssl.NonValidatingFactory&connectTimeout=10&socketTimeout=30&tcpKeepAlive=true", 
                                         host, port, database);
            
            // URL R2DBC para aplicação (completamente independente, NUNCA compartilha base com JDBC)
            String r2dbcUrl = String.format("r2dbc:postgresql://%s:%d/%s?sslMode=require", host, port, database);
            
            // Configura Flyway (JDBC) - URL completamente separada
            properties.put("spring.flyway.url", jdbcUrl);
            properties.put("spring.flyway.user", username);
            properties.put("spring.flyway.password", password);
            
            // Configura R2DBC (aplicação) - URL completamente separada
            properties.put("spring.r2dbc.url", r2dbcUrl);
            properties.put("spring.r2dbc.username", username);
            properties.put("spring.r2dbc.password", password);
            
            System.out.println("JDBC URL (Flyway) construída independentemente: " + jdbcUrl.replaceAll("://[^:]+:[^@]+@", "://***:***@"));
            System.out.println("R2DBC URL (aplicação) construída independentemente: " + r2dbcUrl);
            System.out.println("IMPORTANTE: URLs são completamente separadas e não compartilham base");

            // Também define variáveis auxiliares
            properties.put("FLYWAY_JDBC_URL", jdbcUrl);
            properties.put("FLYWAY_USER", username);
            properties.put("FLYWAY_PASSWORD", password);
            properties.put("R2DBC_URL", r2dbcUrl);
            
            System.out.println("SSL configurado - JDBC: sslmode=prefer, R2DBC: sslMode=require");
            System.out.println("Timeouts configurados para JDBC: connectTimeout=10, socketTimeout=30");
            
            // Atualiza DB_HOST com o host completo (importante!)
            properties.put("DB_HOST", host);
            properties.put("DB_PORT", String.valueOf(port));
            properties.put("DB_NAME", database);
            properties.put("DB_USERNAME", username);
            properties.put("DB_PASSWORD", password);
            
            System.out.println("Configurado Flyway com URL JDBC completa: host=" + host + ", port=" + port + ", database=" + database);
            log.info("Configurado Flyway com URL JDBC completa: host={}, port={}, database={}", host, port, database);
            log.info("URL JDBC (mascarada): jdbc:postgresql://{}:{}/{}?sslmode=prefer", host, port, database);
            
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
