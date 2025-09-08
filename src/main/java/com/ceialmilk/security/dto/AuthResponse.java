package com.ceialmilk.security.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private String email;
    private String perfil;

    public AuthResponse(String token, String email, String perfil) {
        this.token = token;
        this.email = email;
        this.perfil = perfil;
    }
}
