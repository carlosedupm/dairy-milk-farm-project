import { isAnimalForaDoRebanho, type Animal } from "@/services/animais";

/** Registo de Gestão ligado a animal com baixa efetiva (BR-BAIXA-010). */
export function isGestaoRegistroAnimalBaixado(
  animalId: number,
  animaisById: Map<number, Animal>,
): boolean {
  const animal = animaisById.get(animalId);
  if (!animal) return false;
  return isAnimalForaDoRebanho(animal);
}

/** Enquanto o mapa não está completo, não mostrar Editar/Excluir (evita falso negativo). */
export function isGestaoRegistroEdicaoBloqueada(
  animalId: number,
  animaisById: Map<number, Animal>,
  animaisResolved: boolean,
): boolean {
  if (!animaisResolved) return true;
  return isGestaoRegistroAnimalBaixado(animalId, animaisById);
}

export const GESTAO_REGISTRO_BAIXADO_MSG =
  "Este registo pertence a um animal baixado do rebanho. O histórico é só consulta — para alterar o ciclo, reverta a baixa na ficha do animal.";
