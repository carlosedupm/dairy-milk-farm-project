package com.ceialmilk.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Table("usuarios")
public class Usuario {

    @Id
    private Long id;

    private String nome;
    private String email;

    @Column("senha")
    private String senha;

    private String perfil;

    @Column("enabled")
    private Boolean enabled;

    public boolean isEnabled() {
        return enabled != null ? enabled : true;
    }
}
