package com.ceialmilk.controller;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.ceialmilk.security.JwtUtil;
import com.ceialmilk.security.dto.AuthRequest;
import com.ceialmilk.security.dto.AuthResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    @Qualifier("loginAuthenticationManager")
    private final ReactiveAuthenticationManager loginAuthenticationManager;
    private final JwtUtil jwtUtil;

    @PostMapping("/login")
    public Mono<ResponseEntity<AuthResponse>> login(@Valid @RequestBody AuthRequest authRequest) {
        log.debug("Tentativa de login para email: {}", authRequest.getEmail());
        log.debug("Senha fornecida: {}", authRequest.getPassword());

        return loginAuthenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        authRequest.getEmail(),
                        authRequest.getPassword()
                )
        )
        .doOnNext(auth -> {
            log.debug("Autenticação bem-sucedida para: {}", authRequest.getEmail());
            log.debug("Authentication object: {}", auth);
            log.debug("Authorities: {}", auth.getAuthorities());
        })
        .doOnError(error -> {
            log.error("Falha na autenticação para {}: {}", authRequest.getEmail(), error.getMessage());
            log.error("Stack trace: ", error);
        })
        .map(authentication -> {
            log.debug("Gerando token JWT para: {}", authRequest.getEmail());
            String token = jwtUtil.generateToken(authentication);

            // Verifica se há authorities e pega o perfil
            String perfil = "USER"; // valor padrão
            if (authentication.getAuthorities() != null && !authentication.getAuthorities().isEmpty()) {
                perfil = authentication.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
            }

            log.debug("Token JWT gerado para {} com perfil: {}", authRequest.getEmail(), perfil);
            log.debug("Token: {}", token);
            return ResponseEntity.ok(new AuthResponse(token, authRequest.getEmail(), perfil));
        })
        .onErrorResume(e -> {
            log.warn("Login falhou para {}: {}", authRequest.getEmail(), e.getMessage());
            log.warn("Exception type: {}", e.getClass().getName());
            return Mono.just(ResponseEntity.status(401).build());
        });
    }

    @PostMapping("/validate")
    public Mono<ResponseEntity<Boolean>> validateToken(@RequestBody String token) {
        return Mono.just(ResponseEntity.ok(jwtUtil.validateToken(token)));
    }

}
