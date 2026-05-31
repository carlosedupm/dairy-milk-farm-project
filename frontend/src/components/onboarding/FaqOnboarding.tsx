export function FaqOnboarding() {
  return (
    <details className="rounded-lg border border-border/80 bg-background/50 text-left">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground">
        Perguntas frequentes
      </summary>
      <div className="space-y-4 border-t border-border/60 px-4 py-3 text-sm text-muted-foreground">
        <div>
          <p className="font-medium text-foreground">
            Porque não consigo ver animais ou produção?
          </p>
          <p className="mt-1">
            Contas com perfil <strong>USER</strong> existem por razões de
            segurança: até ter fazenda e perfil adequados, o acesso a dados da
            exploração fica limitado. Um{" "}
            <strong>administrador da plataforma</strong> deve vincular a sua
            conta e definir o perfil operacional.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">
            Posso criar a minha própria fazenda nesta página?
          </p>
          <p className="mt-1">
            Não com perfil <strong>USER</strong>. O registo de novas explorações
            neste fluxo fica reservado a contas já com perfil{" "}
            <strong>Proprietário</strong> (titular). Quem acaba de criar conta
            deve aguardar que um <strong>administrador da plataforma</strong>{" "}
            vincule a conta a uma fazenda existente e defina o perfil adequado.
          </p>
        </div>
        <div>
          <p className="font-medium text-foreground">
            Já falei com o administrador
          </p>
          <p className="mt-1">
            Volte a iniciar sessão mais tarde ou use «Ir ao início» para
            verificar se a provisão já foi concluída. Se continuar bloqueado,
            confirme com o administrador que o seu email está correto e que o
            perfil deixou de ser <strong>USER</strong>.
          </p>
        </div>
      </div>
    </details>
  );
}
