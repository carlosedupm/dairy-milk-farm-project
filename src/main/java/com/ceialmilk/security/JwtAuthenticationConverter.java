package com.ceialmilk.security;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.server.authentication.ServerAuthenticationConverter;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RequiredArgsConstructor
public class JwtAuthenticationConverter implements ServerAuthenticationConverter {

    private final JwtUtil jwtUtil;

    @Override
    public Mono<Authentication> convert(ServerWebExchange exchange) {
        return Mono.justOrEmpty(exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION))
                .filter(authHeader -> authHeader.startsWith("Bearer "))
                .map(authHeader -> authHeader.substring(7))
                .filter(jwtUtil::validateToken)
                .map(token -> {
                    String username = jwtUtil.extractUsername(token);
                    String authorities = jwtUtil.extractAuthorities(token);

                    List<SimpleGrantedAuthority> grantedAuthorities = Arrays.stream(authorities.split(","))
                            .filter(auth -> auth != null && !auth.trim().isEmpty())
                            .map(SimpleGrantedAuthority::new)
                            .collect(Collectors.toList());

                    return new UsernamePasswordAuthenticationToken(
                            username, null, grantedAuthorities
                    );
                });
    }
}
