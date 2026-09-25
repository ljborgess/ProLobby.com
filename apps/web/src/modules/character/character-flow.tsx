'use client'

import { BackAction } from '@/common/ui/back-action'
import { useState } from 'react'
import { useCharacterContent } from '@/hooks/use-character-content'
import { CharacterForm } from './character-form'
import { PrintUpload } from './print-upload'
import type { CharacterCategory } from '@/content/character'
import { Roster } from './roster'
import type { ArchetypeOption, CharacterView } from './types'

/**
 * Create a character, then send its print — or send the print of one already
 * created and still pending. Verified characters are listed, not re-sent.
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
  const [sendingFor, setSendingFor] = useState<string | null>(null)
  // null: no form open. A category: the form, preset to the place picked on
  // the pitch — the pitch is the position picker, even on an empty account.
  const [creating, setCreating] = useState<CharacterCategory | null>(null)

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
        }}
      />
    )
  }

  return (
    <Roster
      characters={characters}
      onClaim={(category) => setCreating(category)}
      onPick={() => setCreating(null)}
      onSend={(id) => setSendingFor(id)}
      widget={
        creating === null ? null : (
          <section
            aria-labelledby="new-character"
            className="landing-card landing-fade-up flex w-full flex-col gap-4 rounded-md border border-accent/25 bg-surface px-5 py-5"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id="new-character" className="font-display text-lg font-medium text-foreground">
                {content.roster.formHeading}
              </h2>
              {characters.length > 0 && (
                <BackAction
                  onClick={() => setCreating(null)}
                  label={content.roster.cancel}
                  kind="cancel"
                />
              )}
            </div>
            <CharacterForm
              key={creating}
              archetypes={archetypes}
              initialCategory={creating}
              taken={characters.map((item) => item.category)}
              onCreated={(character) => {
                setCharacters((current) => [
                  ...current.filter((item) => item.category !== character.category),
                  character,
                ])
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
