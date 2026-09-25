'use client'

import { useState } from 'react'
import { BackAction } from '@/common/ui/back-action'
import type { CharacterCategory } from '@/content/character'
import { useCharacterContent } from '@/hooks/use-character-content'
import { CharacterForm } from './character-form'
import { PrintUpload } from './print-upload'
import { firstToLookAt, Roster } from './roster'
import type { ArchetypeOption, CharacterView } from './types'

/**
 * The squad on its pitch, the registration in the panel beside it, and the
 * print upload on its own screen. The picked place lives here, so leaving
 * for the print and coming back lands on the same place, with focus on it.
 */
export function CharacterFlow({
  characters: initial,
  archetypes,
}: {
  characters: CharacterView[]
  archetypes: ArchetypeOption[]
}) {
  const content = useCharacterContent()
  const [characters, setCharacters] = useState(initial)
  const [selected, setSelected] = useState<CharacterCategory>(() => firstToLookAt(initial))
  const [sendingFor, setSendingFor] = useState<string | null>(null)
  // null: no form open. A category: the form, preset to the place picked on
  // the pitch — the pitch is the position picker, even on an empty account.
  const [creating, setCreating] = useState<CharacterCategory | null>(null)
  // Bumped whenever a panel closes, so focus returns to the picked place.
  const [focusKey, setFocusKey] = useState(0)

  function close() {
    setCreating(null)
    setFocusKey((key) => key + 1)
  }

  if (sendingFor) {
    return (
      <PrintUpload
        characterId={sendingFor}
        onBack={(received) => {
          if (received) {
            setCharacters((current) =>
              current.map((item) =>
                item.id === sendingFor
                  ? { ...item, lastPrint: { status: 'received', rejection: null } }
                  : item,
              ),
            )
          }
          setSendingFor(null)
          setFocusKey((key) => key + 1)
        }}
      />
    )
  }

  return (
    <Roster
      characters={characters}
      selected={selected}
      focusKey={focusKey}
      onSelect={(category) => {
        setSelected(category)
        setCreating(null)
      }}
      onClaim={(category) => setCreating(category)}
      onSend={(id) => setSendingFor(id)}
      widget={
        creating === null ? null : (
          <section
            aria-labelledby="new-character"
            className="landing-fade-up flex w-full flex-col gap-4 rounded-md border border-accent/25 bg-surface px-5 py-5 shadow-[inset_0_1px_0_0_rgb(255_255_255/6%)]"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 id="new-character" className="font-display text-lg font-medium text-foreground">
                {content.roster.formHeading}
              </h3>
              <BackAction onClick={close} label={content.roster.cancel} kind="cancel" />
            </div>
            <CharacterForm
              key={creating}
              archetypes={archetypes}
              initialCategory={creating}
              squad={characters}
              onCreated={(character) => {
                setCharacters((current) => [
                  ...current.filter((item) => item.category !== character.category),
                  character,
                ])
                setSelected(character.category)
                setCreating(null)
                setSendingFor(character.id)
              }}
            />
          </section>
        )
      }
    />
  )
}
