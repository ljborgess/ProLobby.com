import { ModerationCaseType } from './moderation-case.enums'

describe('ModerationCaseType (#155)', () => {
  it('has the linked-identity-change value RF-082 needs', () => {
    expect(ModerationCaseType.LINKED_IDENTITY_CHANGE).toBe('linked_identity_change')
  })
})
