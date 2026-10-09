import { AccountRole } from './account.enums'
import { parseArgs } from './set-role.cli'

describe('set-role parseArgs', () => {
  it('reads the email the way sign-in stores it, and the role', () => {
    expect(parseArgs([' Someone@Test.Local ', 'moderator', ' Admin@Test.Local'])).toEqual({
      email: 'someone@test.local',
      role: AccountRole.MODERATOR,
      operator: 'admin@test.local',
    })
  })

  it('refuses a role that does not exist', () => {
    expect(() => parseArgs(['someone@test.local', 'superuser', 'admin@test.local'])).toThrow(
      'unknown role superuser',
    )
  })

  it('refuses a missing argument, including who runs it', () => {
    expect(() => parseArgs(['someone@test.local'])).toThrow('usage')
    expect(() => parseArgs(['someone@test.local', 'moderator'])).toThrow('usage')
  })
})
