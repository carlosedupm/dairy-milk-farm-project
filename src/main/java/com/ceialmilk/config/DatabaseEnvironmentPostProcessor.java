package com.ceialmilk.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.util.HashMap;
import java.util.Map;

/**
 * Processador para garantir que a aplicação use os padrões do Render.
 * Este processador desabilita o Flyway interno e garante que o R2DBC
 * use os parâmetros corretos passados pelo entrypoint.sh.
 */
public class DatabaseEnvironmentPostProcessor implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> props = new HashMap<>();

        // O entrypoint.sh já exporta SPRING_R2DBC_URL, mas garantimos aqui
        // que o Flyway interno nunca tente iniciar, pois já rodamos via CLI.
        props.put("spring.flyway.enabled", "false");
        
        // Desabilitar logs ruidosos de bean override se necessário
        props.put("spring.main.allow-bean-definition-overriding", "true");

        if (!props.isEmpty()) {
            environment.getPropertySources().addFirst(new MapPropertySource("renderRuntimeProps", props));
        }
    }
}
