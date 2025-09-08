package com.ceialmilk.security;

import com.ceialmilk.model.Usuario;
import com.ceialmilk.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserDetailsServiceImpl implements ReactiveUserDetailsService {

    private final UsuarioRepository usuarioRepository;

    @Override
    public Mono<UserDetails> findByUsername(String email) {
        log.debug("Buscando usuário por email: {}", email);
        return usuarioRepository.findByEmail(email)
                .doOnNext(usuario -> {
                    log.debug("Usuário encontrado: {}", usuario.getEmail());
                    log.debug("Senha do usuário: {}", usuario.getSenha());
                    log.debug("Perfil do usuário: {}", usuario.getPerfil());
                    log.debug("Enabled status: {}", usuario.isEnabled());
                })
                .doOnError(error -> log.error("Erro ao buscar usuário: {}", error.getMessage()))
                .map(this::mapToUserDetails)
                .switchIfEmpty(Mono.defer(() -> {
                    log.warn("Usuário não encontrado para email: {}", email);
                    return Mono.empty();
                }));
    }

    private UserDetails mapToUserDetails(Usuario usuario) {
        log.debug("Mapeando UserDetails para: {}", usuario.getEmail());
        log.debug("Senha no mapToUserDetails: {}", usuario.getSenha());

        return User.builder()
                .username(usuario.getEmail())
                .password(usuario.getSenha())
                .authorities(Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + usuario.getPerfil())
                ))
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(!usuario.isEnabled())
                .build();
    }
}
