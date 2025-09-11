package com.ceialmilk.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.connection.ReactiveRedisConnectionFactory;
import io.lettuce.core.SocketOptions;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.RedisPassword;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceClientConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.ReactiveRedisOperations;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.ceialmilk.dto.FazendaResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
public class RedisConfig {

    private static final Logger logger = LoggerFactory.getLogger(RedisConfig.class);

    @Bean
    @Primary
    public ReactiveRedisConnectionFactory reactiveRedisConnectionFactory(
            @Value("${spring.data.redis.host}") String host,
            @Value("${spring.data.redis.port}") int port,
            @Value("${spring.data.redis.password}") String password) {
        
        logger.info("Tentando conectar ao Redis: {}:{}", host, port);
        
        try {
            RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
            config.setHostName(host);
            config.setPort(port);
            config.setPassword(RedisPassword.of(password));
            
            LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
                .socketOptions(SocketOptions.builder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build()
                )
                .useSsl() // Habilitar SSL para conexão segura
                .build();
            
            return new LettuceConnectionFactory(config, clientConfig);
        } catch (Exception e) {
            logger.error("Falha na configuração da conexão Redis", e);
            throw e;
        }
    }

    @Bean
    public ReactiveRedisOperations<String, FazendaResponseDTO> reactiveRedisOperations(
            @Qualifier("reactiveRedisConnectionFactory") ReactiveRedisConnectionFactory factory) {
        
        // Configurar ObjectMapper para suportar Java 8 Date/Time
        ObjectMapper objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        
        Jackson2JsonRedisSerializer<FazendaResponseDTO> serializer = 
            new Jackson2JsonRedisSerializer<>(FazendaResponseDTO.class);
        serializer.setObjectMapper(objectMapper);
        
        RedisSerializationContext.RedisSerializationContextBuilder<String, FazendaResponseDTO> builder =
            RedisSerializationContext.newSerializationContext(new StringRedisSerializer());
        
        RedisSerializationContext<String, FazendaResponseDTO> context = 
            builder.value(serializer).build();
            
        return new ReactiveRedisTemplate<>(factory, context);
    }
}
