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
