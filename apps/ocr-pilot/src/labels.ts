import type { AttributeKey, GameLanguage } from './types'
import { ATTRIBUTE_KEYS } from './types'

/**
 * Stems, not full labels. The Attributes tab truncates with ellipses
 * (`Interceptio…`, `Heading A…`, `Stand Tack…`, `Sprint Spe…`) and the cut
 * moves with the UI language, so a full-string match would fail on the real
 * screen. Longest stem wins when two attributes share a prefix.
 *
 * Group headers are deliberately absent. Using them as section anchors is
 * what breaks between FC 26 (`Dribbling` / `Shooting`) and FC 27
 * (`Ball Control` / `Scoring`).
 */
export type AttributeStem = {
  key: AttributeKey
  language: GameLanguage
  stem: string
}

const EN: Record<AttributeKey, string[]> = {
  acceleration: ['Acceleration'],
  sprintSpeed: ['Sprint Spe', 'Sprint Speed'],
  attPosition: ['Att. Position', 'Attacking Pos'],
  finishing: ['Finishing'],
  shotPower: ['Shot Power'],
  longShots: ['Long Shots'],
  volleys: ['Volleys'],
  penalties: ['Penalties'],
  vision: ['Vision'],
  crossing: ['Crossing'],
  fkAccuracy: ['FK Acc', 'FK Accuracy'],
  shortPassing: ['Short Pass'],
  longPassing: ['Long Pass'],
  curve: ['Curve'],
  agility: ['Agility'],
  balance: ['Balance'],
  reactions: ['Reactions'],
  ballControl: ['Ball Control'],
  dribbling: ['Dribbling'],
  composure: ['Composure'],
  interceptions: ['Interceptio', 'Interceptions'],
  headingAccuracy: ['Heading A', 'Heading Acc'],
  defAwareness: ['Def Aware', 'Def. Awareness'],
  standingTackle: ['Stand Tack', 'Standing Tackle'],
  slidingTackle: ['Slide Tack', 'Sliding Tackle'],
  jumping: ['Jumping'],
  stamina: ['Stamina'],
  strength: ['Strength'],
  aggression: ['Aggression'],
}

const PT: Record<AttributeKey, string[]> = {
  acceleration: ['Aceleracao', 'Aceleração'],
  sprintSpeed: ['Velocidade sprint', 'Veloc. sprint', 'Velocidade de sprint'],
  attPosition: ['Pos. ofensiva', 'Posicionamento ofensivo'],
  finishing: ['Finalizacao', 'Finalização'],
  shotPower: ['Forca do chute', 'Força do chute'],
  longShots: ['Chutes longos'],
  volleys: ['Voleios'],
  penalties: ['Penaltis', 'Pênaltis'],
  vision: ['Visao', 'Visão'],
  crossing: ['Cruzamentos', 'Cruzamento'],
  fkAccuracy: ['Prec. de falta', 'Precisao de falta', 'Precisão de falta'],
  shortPassing: ['Passe curto'],
  longPassing: ['Passe longo'],
  curve: ['Efeito'],
  agility: ['Agilidade'],
  balance: ['Equilibrio', 'Equilíbrio'],
  reactions: ['Reacoes', 'Reações'],
  ballControl: ['Controle de bola'],
  dribbling: ['Drible'],
  composure: ['Impostura'],
  interceptions: ['Interceptac', 'Interceptação', 'Interceptacoes'],
  headingAccuracy: ['Prec. de cabeceio', 'Precisao de cabeceio', 'Precisão de cabeceio'],
  defAwareness: ['Cons. defensiva', 'Consciencia defensiva', 'Consciência defensiva'],
  standingTackle: ['Desarme em pe', 'Desarme em pé', 'Desarme parado'],
  slidingTackle: ['Carrinho'],
  jumping: ['Impulsao', 'Impulsão'],
  stamina: ['Resistencia', 'Resistência'],
  strength: ['Forca', 'Força'],
  aggression: ['Agressividade'],
}

const ES: Record<AttributeKey, string[]> = {
  acceleration: ['Aceleracion', 'Aceleración'],
  sprintSpeed: ['Velocidad sprint', 'Velocidad de sprint'],
  attPosition: ['Pos. ataque', 'Posicionamiento ofensivo'],
  finishing: ['Definicion', 'Definición'],
  shotPower: ['Potencia de tiro'],
  longShots: ['Tiros lejanos'],
  volleys: ['Voleas'],
  penalties: ['Penaltis', 'Penales'],
  vision: ['Vision', 'Visión'],
  crossing: ['Centros'],
  fkAccuracy: ['Precision faltas', 'Precisión de faltas'],
  shortPassing: ['Pase corto'],
  longPassing: ['Pase largo'],
  curve: ['Efecto'],
  agility: ['Agilidad'],
  balance: ['Equilibrio'],
  reactions: ['Reacciones'],
  ballControl: ['Control del balon', 'Control del balón'],
  dribbling: ['Regate'],
  composure: ['Compostura'],
  interceptions: ['Intercepcio', 'Intercepciones'],
  headingAccuracy: ['Precision de cabeza', 'Precisión de cabezazo'],
  defAwareness: ['Conciencia defensiva'],
  standingTackle: ['Entrada de pie', 'Entrada en pie'],
  slidingTackle: ['Entrada deslizante'],
  strength: ['Fuerza'],
  jumping: ['Salto'],
  stamina: ['Resistencia'],
  aggression: ['Agresividad'],
}

const BY_LANGUAGE: Record<GameLanguage, Record<AttributeKey, string[]>> = {
  en: EN,
  pt: PT,
  es: ES,
}

export function attributeStems(): AttributeStem[] {
  const stems: AttributeStem[] = []
  for (const language of ['en', 'pt', 'es'] as const) {
    const catalog = BY_LANGUAGE[language]
    for (const key of ATTRIBUTE_KEYS) {
      const list = catalog[key]
      for (const stem of list) {
        stems.push({ key, language, stem })
      }
    }
  }
  return stems
}

export function foldAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}
