import { Logger } from '@nestjs/common'

import { AccountCleanupJob } from './account-cleanup.job'
import type { EmailVerificationService } from './email-verification.service'

describe('AccountCleanupJob', () => {
  const asService = (deleteExpiredUnverified: jest.Mock): EmailVerificationService =>
    ({ deleteExpiredUnverified }) as unknown as EmailVerificationService

  it('calls deleteExpiredUnverified and logs the count, including zero', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
    const deleteExpiredUnverified = jest.fn().mockResolvedValue(0)
    const job = new AccountCleanupJob(asService(deleteExpiredUnverified))

    await job.deleteExpiredUnverifiedAccounts()

    expect(deleteExpiredUnverified).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('deleted 0'))
    logSpy.mockRestore()
  })

  it('does not throw when the underlying delete fails — one bad run must not stop the process', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
    const deleteExpiredUnverified = jest.fn().mockRejectedValue(new Error('connection reset'))
    const job = new AccountCleanupJob(asService(deleteExpiredUnverified))

    await expect(job.deleteExpiredUnverifiedAccounts()).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith(
      'failed to delete expired unverified accounts',
      expect.any(String),
    )
    errorSpy.mockRestore()
  })
})
