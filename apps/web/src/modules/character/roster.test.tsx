import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Kit } from '@prolobby/types'
import { renderWithLocale } from '@/test-utils'
import { KIT_SWATCH, type KitLook } from '@/modules/kit/kit-art'
import { Roster, Shirt, type SlotStatus } from './roster'
import type { CharacterView } from './types'

const kit = (primary: Kit['primary']): KitLook => ({
  kit: { primary, secondary: 'navy', pattern: 'plain', crest: 'shield' },
  initials: 'VFC',
})

const STATUSES: SlotStatus[] = ['verified', 'review', 'pending', 'rejected']

describe('Shirt with the club kit', () => {
  it.each(['white', 'black', 'yellow'] as const)(
    'keeps every state apart on a %s kit, the state in the interface colours',
    (primary) => {
      const marks = STATUSES.map((status) => {
        const { container, unmount } = render(
          <Shirt status={status} code="MID" look={kit(primary)} />,
        )
        const svg = container.querySelector('svg')!
        // The shirt is the club's: its primary is in the fabric.
        expect(svg.innerHTML).toContain(KIT_SWATCH[primary].fill)
        // The state sits on the outline and the badge: never a kit colour.
        const outline = svg.querySelector(
          'path[fill="none"].stroke-accent, path[fill="none"].stroke-danger, path[fill="none"][class*="stroke-white"]',
        )
        expect(outline).not.toBeNull()
        const signature = [
          outline!.getAttribute('class'),
          svg.querySelector('circle[class*="fill-background"]')?.getAttribute('class'),
          svg.textContent,
          svg.querySelectorAll('path[class="stroke-accent"]').length,
          svg.querySelectorAll('circle.landing-slot-wait').length,
        ].join('|')
        unmount()
        return signature
      })
      // Verified, in review, pending and rejected are four different drawings.
      expect(new Set(marks).size).toBe(4)
    },
  )

  it.each(['red', 'green', 'navy', 'claret'] as const)(
    'keeps a dark halo under the state ring on a %s kit, so a ring of its own colour still shows',
    (primary) => {
      for (const status of STATUSES) {
        const { container, unmount } = render(
          <Shirt status={status} code="MID" look={kit(primary)} />,
        )
        const halo = container.querySelector('[data-state-halo]')
        expect(halo).not.toBeNull()
        expect(halo!.getAttribute('class')).toContain('stroke-background')
        // The halo is wider than the ring it protects.
        expect(Number(halo!.getAttribute('stroke-width'))).toBeGreaterThan(1.6)
        unmount()
      }
    },
  )

  it.each(['GK', 'DEF', 'MID', 'WNG', 'ST'])(
    'fits the position code %s inside the badge circle',
    (code) => {
      const { container } = render(<Shirt status="pending" code={code} look={kit('white')} />)
      const circle = container.querySelector('circle[class*="fill-background"]')!
      const text = container.querySelector('text')!

      const diameter = 2 * Number(circle.getAttribute('r'))
      // A bold capital is about 0.7 em wide.
      const width = code.length * Number(text.getAttribute('font-size')) * 0.7
      expect(width).toBeLessThan(diameter)
    },
  )

  it('leaves the shirt as it was without a club', () => {
    const { container } = render(<Shirt status="verified" code="MID" />)
    expect(container.querySelector('[data-kit-shirt]')).toBeNull()
    expect(container.querySelector('path.fill-accent')).not.toBeNull()
  })

  it('keeps a free place faint even with a kit', () => {
    const { container } = render(<Shirt status="empty" code="MID" look={kit('yellow')} />)
    expect(container.querySelector('[data-kit-shirt]')).toBeNull()
  })

  it('does not put the kit colour on anything but the fabric', () => {
    const { container } = render(<Shirt status="rejected" code="MID" look={kit('yellow')} />)
    const outline = container.querySelector('path[fill="none"].stroke-danger')
    expect(outline).not.toBeNull()
    expect(outline!.getAttribute('stroke')).toBeNull()
  })
})

const CHARACTERS: CharacterView[] = [
  {
    id: 'c1',
    category: 'midfielder',
    archetype: 'MAESTRO',
    platform: 'ps5',
    state: 'verified',
    elo: 1000,
  },
]

function renderRoster(look: KitLook | null) {
  return renderWithLocale(
    <Roster
      characters={CHARACTERS}
      selected="midfielder"
      onSelect={vi.fn()}
      focusKey={0}
      onClaim={vi.fn()}
      onSend={vi.fn()}
      widget={null}
      look={look}
    />,
  )
}

describe('Roster', () => {
  it('dresses the places in the club kit, free places aside', () => {
    const { container } = renderRoster(kit('red'))
    expect(container.querySelectorAll('[data-kit-shirt]')).toHaveLength(1)
    // The button still says the state in words.
    expect(screen.getByRole('button', { name: /MAESTRO/ })).toBeInTheDocument()
  })

  it('changes nothing without a club', () => {
    const { container } = renderRoster(null)
    expect(container.querySelector('[data-kit-shirt]')).toBeNull()
  })
})
