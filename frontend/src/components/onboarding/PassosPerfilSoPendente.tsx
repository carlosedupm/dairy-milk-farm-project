export function PassosPerfilSoPendente() {
  return (
    <section
      aria-labelledby="passos-perfil-heading"
      className="rounded-lg border border-border/80 bg-muted/30 p-4 text-left"
    >
      <h2
        id="passos-perfil-heading"
        className="text-sm font-semibold text-foreground"
      >
        Falta apenas um passo
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          A sua conta já tem fazenda(s) vinculada(s) — obrigado por aguardar
          essa fase.
        </li>
        <li>
          Peça a um administrador que altere o seu perfil de{" "}
          <strong>USER</strong> para o perfil adequado à sua função (Funcionário,
          Gerente, Gestão, etc.), no painel de utilizadores.
        </li>
        <li>
          Assim que o perfil for atualizado, os módulos do sistema ficam
          disponíveis conforme as permissões desse perfil.
        </li>
      </ol>
      <p className="mt-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Prazo:</strong> normalmente breve
        assim que o administrador tratar o pedido; o tempo exato depende da sua
        organização.
      </p>
    </section>
  );
}
