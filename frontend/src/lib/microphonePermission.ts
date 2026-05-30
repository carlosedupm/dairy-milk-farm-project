/** Mensagem quando o usuário bloqueou o microfone no navegador. */
export const MIC_PERMISSION_DENIED_MESSAGE =
  "Permissão de microfone negada. Clique no ícone de cadeado ou informações na barra de endereço, permita o microfone para este site e toque em «Tentar microfone» abaixo.";

export function isMicPermissionDeniedMessage(msg: string | null | undefined): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return (
    lower.includes("permissão de microfone negada") ||
    lower.includes("permission") && lower.includes("negad")
  );
}

/**
 * Solicita acesso ao microfone no gesto do usuário (deve ser chamado no clique).
 * Retorna null se OK ou mensagem de erro para exibir.
 */
export async function requestMicrophoneAccess(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "Microfone não disponível neste navegador ou contexto (use HTTPS).";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    stream.getTracks().forEach((t) => t.stop());
    return null;
  } catch (err) {
    if (err instanceof DOMException) {
      switch (err.name) {
        case "NotAllowedError":
        case "PermissionDeniedError":
          return MIC_PERMISSION_DENIED_MESSAGE;
        case "NotFoundError":
          return "Nenhum microfone encontrado no dispositivo.";
        case "NotReadableError":
          return "O microfone está em uso por outro aplicativo.";
        case "SecurityError":
          return "Acesso ao microfone bloqueado. Abra o site em HTTPS ou localhost.";
        default:
          return `Não foi possível acessar o microfone (${err.name}).`;
      }
    }
    return "Não foi possível acessar o microfone.";
  }
}
