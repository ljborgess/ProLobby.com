import { announce, announceCommand } from './announce-command'

describe('/anunciar', () => {
  const deps = () => ({
    channelId: '900000000000000003',
    post: jest.fn().mockResolvedValue(undefined),
  })

  it('posts the text to the announcements channel and confirms privately', async () => {
    const d = deps()

    const reply = await announce(
      { allowed: true, text: '  Fila abre às 20h  ', pingEveryone: false },
      d,
    )

    expect(d.post).toHaveBeenCalledWith('900000000000000003', 'Fila abre às 20h', false)
    expect(reply).toBe('Anúncio postado em <#900000000000000003>.')
  })

  it('refuses someone without Manage Server, even if the command reached them', async () => {
    const d = deps()

    const reply = await announce({ allowed: false, text: 'oi', pingEveryone: true }, d)

    expect(d.post).not.toHaveBeenCalled()
    expect(reply).toContain('Só Admin e Moderador')
  })

  it('says so when no channel is configured, instead of failing silently', async () => {
    const d = { ...deps(), channelId: undefined }

    expect(await announce({ allowed: true, text: 'oi', pingEveryone: false }, d)).toContain(
      'DISCORD_ANNOUNCEMENTS_CHANNEL_ID',
    )
    expect(d.post).not.toHaveBeenCalled()
  })

  it('does not post an empty announcement', async () => {
    const d = deps()

    await announce({ allowed: true, text: '   ', pingEveryone: false }, d)

    expect(d.post).not.toHaveBeenCalled()
  })

  it('is hidden from members without Manage Server and never offered in a DM', () => {
    const json = announceCommand.toJSON()

    expect(json.default_member_permissions).toBe('32')
    expect(json.contexts).toEqual([0])
  })
})
