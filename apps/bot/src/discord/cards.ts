import { join } from 'node:path'
import { renderAsync } from '@resvg/resvg-js'

/**
 * The bot's pictures, drawn like the landing (DESIGN.md "Cabine de
 * Transmissão"): near-black pitch, the skewed plate with the green tab,
 * shirts instead of avatars, Barlow Condensed for anything that reads like a
 * scoreboard. SVG built here, turned into PNG by resvg with the site's own
 * fonts — no browser, no external service.
 *
 * No emoji in the pictures: the fonts do not carry them. Every picture also
 * travels with its alt text, set where the file is attached.
 */

const FONTS_DIR = join(__dirname, '..', '..', 'assets', 'fonts')
const FONT_FILES = ['Sora.ttf', 'BarlowCondensed-Bold.ttf', 'BarlowCondensed-SemiBold.ttf'].map(
  (file) => join(FONTS_DIR, file),
)

export const INK = {
  bg: '#070b14',
  surface: '#0c1322',
  line: 'rgba(255,255,255,0.08)',
  text: '#e8edf5',
  soft: '#94a3b8',
  green: '#22c55e',
  greenDeep: '#15803d',
  amber: '#f5b841',
} as const

const SORA = 'font-family="Sora"'
const BARLOW = 'font-family="Barlow Condensed"'

/**
 * Off the event loop: resvg rasterizes on libuv's thread pool, so a burst of
 * joins does not stall the gateway heartbeat or the webhook server.
 */
export async function render(svg: string): Promise<Buffer> {
  const image = await renderAsync(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Sora' },
  })
  return image.asPng()
}

/** Text that came from a person goes through here before it touches the SVG. */
export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function clip(text: string, max: number): string {
  const chars = [...text.trim()]
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : chars.join('')
}

/** Greedy word wrap, for the few lines a banner holds. */
export function wrap(text: string, perLine: number, lines: number): string[] {
  const out: string[] = []
  let current = ''
  for (const word of text.trim().split(/\s+/)) {
    const next = current ? `${current} ${word}` : word
    if (next.length > perLine && current) {
      out.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) out.push(current)
  if (out.length > lines) {
    out.length = lines
    out[lines - 1] = clip(`${out[lines - 1]} …`, perLine)
  }
  return out
}

/** The site's shirt (kit-art.tsx), in a 48×48 box. */
const SHIRT = 'M17 7l7 3 7-3 11 6-4 9-4-2v22H14V20l-4 2-4-9z'

function shirt(x: number, y: number, size: number, fill: string, trim = INK.bg): string {
  const s = size / 48
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="${SHIRT}" fill="${fill}" stroke="rgba(0,0,0,0.35)" stroke-width="0.6" stroke-linejoin="round"/>
    <path d="M17 7l7 3 7-3" fill="none" stroke="${trim}" stroke-width="1.6" stroke-linejoin="round"/>
  </g>`
}

/** The broadcast plate: a skewed band with the green tab, like `.landing-plate`. */
function plate(x: number, y: number, label: string, color: string = INK.green): string {
  const width = 26 + label.length * 13.2
  return `<g transform="translate(${x} ${y})">
    <polygon points="10,0 ${width + 10},0 ${width},40 0,40" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)"/>
    <polygon points="10,0 18,0 8,40 0,40" fill="${color}"/>
    <text x="28" y="28" ${BARLOW} font-weight="700" font-size="22" letter-spacing="2.4" fill="${INK.text}">${escapeXml(label)}</text>
  </g>`
}

function frame(width: number, height: number, body: string, glow: string = INK.green): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="glow" cx="0.12" cy="0" r="0.75">
      <stop offset="0" stop-color="${glow}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="${INK.bg}"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <g stroke="rgba(255,255,255,0.035)" fill="none">
    <circle cx="${width - 150}" cy="${height / 2}" r="${height * 0.42}"/>
    <line x1="${width - 150}" y1="0" x2="${width - 150}" y2="${height}"/>
  </g>
  ${body}
</svg>`
}

export type Band = 'low' | 'busy' | 'full'
export type Pause = 'discord_unavailable' | 'channels_full' | 'lobbies_full' | null

const POSITIONS = [
  ['goalkeeper', 'GOL', 'Goleiro'],
  ['defender', 'ZAG', 'Zaga'],
  ['midfielder', 'MEI', 'Meio-campo'],
  ['winger', 'PON', 'Ponta'],
  ['striker', 'ATA', 'Ataque'],
] as const

const BAND_LABEL: Record<Band, string> = { low: 'POUCA GENTE', busy: 'MOVIMENTADA', full: 'CHEIA' }
const BAND_STEPS: Record<Band, number> = { low: 1, busy: 2, full: 3 }

export const PAUSE_LABEL: Record<Exclude<Pause, null>, string> = {
  discord_unavailable: 'Pausada: o Discord está fora do ar',
  channels_full: 'Pausada: sem espaço pra canais de lobby',
  lobbies_full: 'Pausada: todos os lobbies ocupados',
}

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })

/** #fila-status: the queue as a broadcast scoreboard, one column per position. */
export function boardSvg(
  bands: Record<(typeof POSITIONS)[number][0], Band>,
  paused: Pause,
  at: string,
): string {
  const W = 1200
  const H = 440
  const live = paused === null
  const status = live ? INK.green : INK.amber
  const columns = POSITIONS.map(([key, code, name], i) => {
    const band = bands[key]
    const x = 48 + i * 224
    const lit = BAND_STEPS[band]
    const shirtFill =
      band === 'low' ? 'rgba(232,237,245,0.28)' : band === 'busy' ? INK.greenDeep : INK.green
    const meter = [0, 1, 2]
      .map(
        (step) =>
          `<rect x="${x + 40 + step * 50}" y="330" width="42" height="8" rx="4" fill="${step < lit ? INK.green : 'rgba(255,255,255,0.1)'}"/>`,
      )
      .join('')
    return `<g>
      <rect x="${x}" y="104" width="208" height="270" rx="18" fill="${INK.surface}" stroke="${band === 'full' ? INK.green : INK.line}" stroke-width="${band === 'full' ? 2 : 1}"/>
      ${shirt(x + 56, 124, 96, shirtFill)}
      <text x="${x + 104}" y="278" text-anchor="middle" ${BARLOW} font-weight="700" font-size="58" letter-spacing="2" fill="${INK.text}">${code}</text>
      <text x="${x + 104}" y="306" text-anchor="middle" ${SORA} font-size="17" fill="${INK.soft}">${name}</text>
      ${meter}
      <text x="${x + 104}" y="362" text-anchor="middle" ${BARLOW} font-weight="600" font-size="19" letter-spacing="2" fill="${band === 'low' ? INK.soft : INK.green}">${BAND_LABEL[band]}</text>
    </g>`
  }).join('')
  return frame(
    W,
    H,
    `${plate(48, 36, 'PROLOBBY · FILA AO VIVO')}
    <g transform="translate(${W - 48 - 190} 36)">
      <rect width="190" height="40" rx="20" fill="${status}" fill-opacity="0.14" stroke="${status}" stroke-opacity="0.6"/>
      ${live ? `<circle cx="30" cy="20" r="7" fill="${status}"/>` : `<rect x="23" y="12" width="5" height="16" fill="${status}"/><rect x="33" y="12" width="5" height="16" fill="${status}"/>`}
      <text x="50" y="28" ${BARLOW} font-weight="700" font-size="22" letter-spacing="2.4" fill="${status}">${live ? 'NO AR' : 'PAUSADA'}</text>
    </g>
    ${columns}
    <text x="48" y="414" ${SORA} font-size="18" fill="${live ? INK.soft : INK.amber}">${escapeXml(live ? 'Fechando lobbies agora · a IA do jogo completa as vagas que faltam' : PAUSE_LABEL[paused])}</text>
    <text x="${W - 48}" y="414" text-anchor="end" ${BARLOW} font-weight="600" font-size="20" letter-spacing="2" fill="${INK.soft}">ATUALIZADO ${clock(at)}</text>`,
    status,
  )
}

/** Welcome: the pre-match card with the three steps to the queue. */
export function welcomeSvg(name: string): string {
  const W = 1200
  const H = 420
  const steps = [
    ['01', 'Crie a conta', 'e-mail verificado, sem grupo de WhatsApp'],
    ['02', 'Cadastre o personagem', 'o print do jogo prova que ele é seu'],
    ['03', 'Vincule este Discord', 'e entre na fila pela posição que joga'],
  ]
    .map(
      ([n, title, sub], i) => `<g transform="translate(640 ${112 + i * 96})">
        <text x="0" y="46" ${BARLOW} font-weight="700" font-size="56" fill="${INK.green}">${n}</text>
        <text x="84" y="28" ${SORA} font-weight="600" font-size="26" fill="${INK.text}">${title}</text>
        <text x="84" y="58" ${SORA} font-size="18" fill="${INK.soft}">${escapeXml(sub ?? '')}</text>
      </g>`,
    )
    .join('')
  const lineup = ['GOL', 'ZAG', 'MEI', 'PON', 'ATA']
    .map(
      (code, i) => `${shirt(48 + i * 100, 288, 64, i === 2 ? INK.green : 'rgba(232,237,245,0.85)')}
      <text x="${80 + i * 100}" y="378" text-anchor="middle" ${BARLOW} font-weight="700" font-size="20" letter-spacing="2" fill="${i === 2 ? INK.green : INK.soft}">${code}</text>`,
    )
    .join('')
  return frame(
    W,
    H,
    `${plate(48, 36, 'PROLOBBY · ENTRADA EM CAMPO')}
    <text x="48" y="150" ${SORA} font-weight="300" font-size="50" fill="${INK.text}">Chegou no ProLobby,</text>
    <text x="48" y="212" ${SORA} font-weight="600" font-size="50" fill="${INK.green}">${escapeXml(clip(name, 20))}</text>
    <rect x="48" y="238" width="72" height="4" rx="2" fill="${INK.green}"/>
    ${lineup}
    <line x1="604" y1="112" x2="604" y2="380" stroke="${INK.line}"/>
    ${steps}`,
  )
}

/** A closed lobby: the two lines of shirts, never a name. */
export function lobbySvg(sideA: number, sideB: number): string {
  const W = 1200
  const H = 380
  const row = (count: number, x0: number, fill: string) => {
    const size = Math.min(72, Math.floor(440 / Math.max(count, 1)) - 6)
    return Array.from({ length: count }, (_, i) =>
      shirt(x0 + i * (size + 6), 190 - size / 2, size, fill),
    ).join('')
  }
  const widthOf = (count: number) =>
    count * (Math.min(72, Math.floor(440 / Math.max(count, 1)) - 6) + 6)
  return frame(
    W,
    H,
    `${plate(48, 36, 'PROLOBBY · APITO INICIAL')}
    <text x="${W - 48}" y="72" text-anchor="end" ${BARLOW} font-weight="700" font-size="40" letter-spacing="3" fill="${INK.text}">LOBBY FECHADO</text>
    ${row(sideA, 560 - widthOf(sideA), INK.green)}
    <text x="600" y="210" text-anchor="middle" ${BARLOW} font-weight="700" font-size="64" fill="${INK.soft}">×</text>
    ${row(sideB, 640, 'rgba(232,237,245,0.88)')}
    <text x="${560 - widthOf(sideA) / 2}" y="278" text-anchor="middle" ${BARLOW} font-weight="700" font-size="30" letter-spacing="2" fill="${INK.green}">LADO A · ${sideA}</text>
    <text x="${640 + widthOf(sideB) / 2}" y="278" text-anchor="middle" ${BARLOW} font-weight="700" font-size="30" letter-spacing="2" fill="${INK.text}">LADO B · ${sideB}</text>
    <text x="600" y="344" text-anchor="middle" ${SORA} font-size="19" fill="${INK.soft}">Humanos verificados dos dois lados · a IA do jogo completa o resto</text>`,
  )
}

/** The announcement banner: the title on the opening band, like the landing's headline. */
export function announcementSvg(title: string): string {
  const W = 1200
  const lines = wrap(title, 34, 2)
  const H = lines.length > 1 ? 300 : 240
  const text = lines
    .map(
      (line, i) =>
        `<text x="64" y="${150 + i * 62}" ${SORA} font-weight="600" font-size="50" fill="${INK.text}">${escapeXml(line)}</text>`,
    )
    .join('')
  return frame(
    W,
    H,
    `${plate(48, 36, 'PROLOBBY · ANÚNCIO')}
    <polygon points="44,${108} 52,${108} 40,${H - 40} 32,${H - 40}" fill="${INK.green}"/>
    ${text}`,
  )
}
