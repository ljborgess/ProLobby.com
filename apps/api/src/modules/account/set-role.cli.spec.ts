import { AccountRole } from './account.enums'
import { parseArgs } from './set-role.cli'

describe('set-role parseArgs', () => {
  it('reads the email the way sign-in stores it, and the role', () => {
    expect(parseArgs([' Someone@Test.Local ', 'moderator'])).toEqual({
      email: 'someone@test.local',
      role: AccountRole.MODERATOR,
    })
  })

  it('refuses a role that does not exist', () => {
    expect(() => parseArgs(['someone@test.local', 'superuser'])).toThrow('unknown role superuser')
  })

  it('refuses a missing argument', () => {
    expect(() => parseArgs(['someone@test.local'])).toThrow('usage')
  })
})
