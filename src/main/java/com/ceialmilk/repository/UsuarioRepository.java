package com.ceialmilk.repository;

import com.ceialmilk.model.Usuario;
import org.springframework.data.repository.reactive.ReactiveCrudRepository;
import reactor.core.publisher.Mono;

public interface UsuarioRepository extends ReactiveCrudRepository<Usuario, Long> {
    Mono<Usuario> findByEmail(String email);
    Mono<Boolean> existsByEmail(String email);
}
