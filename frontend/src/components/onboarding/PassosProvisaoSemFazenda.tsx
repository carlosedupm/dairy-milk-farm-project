export function PassosProvisaoSemFazenda() {
  return (
    <section
      aria-labelledby="passos-provisao-heading"
      className="rounded-lg border border-border/80 bg-muted/30 p-4 text-left"
    >
      <h2
        id="passos-provisao-heading"
        className="text-sm font-semibold text-foreground"
      >
        O que acontece a seguir
      </h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>
          Entre em contato com quem administra o CeialMilk na sua organização e
          indique o email com que se registou.
        </li>
        <li>
          Um <strong>administrador da plataforma</strong> deve{" "}
          <strong>vincular</strong> a sua conta a fazenda(s) já existentes e
          atribuir um perfil operacional adequado (Funcionário, Gerente,
          Proprietário, etc.).
        </li>
        <li>
          Depois de ter fazenda e perfil adequados, ao fazer login, você terá
          acesso aos módulos autorizados (animais, produção, folgas, etc.).
        </li>
      </ol>
      <p className="mt-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Prazo:</strong> depende da sua
        organização. Em muitos casos o acesso é tratado em até{" "}
        <strong className="text-foreground">um dia útil</strong> após o
        administrador receber o seu pedido; o calendário exato depende da sua
        equipe.
      </p>
    </section>
  );
}
