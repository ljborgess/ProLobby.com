import { Logger } from '@nestjs/common'

import { AccountCleanupJob } from './account-cleanup.job'
import type { AccountRecoveryService } from './account-recovery.service'
import type { EmailVerificationService } from './email-verification.service'
import type { ExpiredRowsService } from './expired-rows.service'

describe('AccountCleanupJob', () => {
  const asVerificationService = (deleteExpiredUnverified: jest.Mock): EmailVerificationService =>
    ({ deleteExpiredUnverified }) as unknown as EmailVerificationService

  const asRecoveryService = (deleteExpiredEvidence: jest.Mock): AccountRecoveryService =>
    ({ deleteExpiredEvidence }) as unknown as AccountRecoveryService

  const jobWith = (
    deleteExpiredUnverified = jest.fn().mockResolvedValue(0),
    deleteExpiredEvidence = jest.fn().mockResolvedValue(0),
  ) =>
    new AccountCleanupJob(
      asVerificationService(deleteExpiredUnverified),
      asRecoveryService(deleteExpiredEvidence),
      {
        purge: jest.fn().mockRejectedValue(new Error('connection reset')),
      } as unknown as ExpiredRowsService,
    )

  describe('unverified accounts', () => {
    it('calls deleteExpiredUnverified and logs the count, including zero', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
      const deleteExpiredUnverified = jest.fn().mockResolvedValue(0)

      await jobWith(deleteExpiredUnverified).deleteExpiredUnverifiedAccounts()

      expect(deleteExpiredUnverified).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('deleted 0'))
      logSpy.mockRestore()
    })

    it('does not throw when the underlying delete fails — one bad run must not stop the process', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
      const deleteExpiredUnverified = jest.fn().mockRejectedValue(new Error('connection reset'))

      await expect(
        jobWith(deleteExpiredUnverified).deleteExpiredUnverifiedAccounts(),
      ).resolves.toBeUndefined()

      expect(errorSpy).toHaveBeenCalledWith(
        'failed to delete expired unverified accounts',
        expect.any(String),
      )
      errorSpy.mockRestore()
    })
  })

  describe('expired evidence', () => {
    it('calls deleteExpiredEvidence and logs the count', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation()
      const deleteExpiredEvidence = jest.fn().mockResolvedValue(2)

      await jobWith(undefined, deleteExpiredEvidence).deleteExpiredEvidence()

      expect(deleteExpiredEvidence).toHaveBeenCalledTimes(1)
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('deleted 2'))
      logSpy.mockRestore()
    })

    it('does not throw when the sweep fails', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()
      const deleteExpiredEvidence = jest.fn().mockRejectedValue(new Error('disk gone'))

      await expect(
        jobWith(undefined, deleteExpiredEvidence).deleteExpiredEvidence(),
      ).resolves.toBeUndefined()

      expect(errorSpy).toHaveBeenCalledWith(
        'failed to delete expired evidence screenshots',
        expect.any(String),
      )
      errorSpy.mockRestore()
    })

    /**
     * The two jobs are independent on purpose: a screenshot sweep that fails
     * must not stop accounts from being deleted, and vice versa.
     */
    it('deletes accounts even when the evidence sweep is broken', async () => {
      jest.spyOn(Logger.prototype, 'log').mockImplementation()
      jest.spyOn(Logger.prototype, 'error').mockImplementation()
      const deleteExpiredUnverified = jest.fn().mockResolvedValue(1)
      const job = jobWith(deleteExpiredUnverified, jest.fn().mockRejectedValue(new Error('boom')))

      await job.deleteExpiredEvidence()
      await job.deleteExpiredUnverifiedAccounts()

      expect(deleteExpiredUnverified).toHaveBeenCalledTimes(1)
      jest.restoreAllMocks()
    })
  })

  it('does not throw when purging expired rows fails', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation()

    await expect(jobWith().purgeExpiredRows()).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalledWith('failed to purge expired rows', expect.any(String))
    errorSpy.mockRestore()
  })
})
