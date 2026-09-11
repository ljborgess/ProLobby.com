import { Injectable } from '@nestjs/common'

/**
 * Free-tier capacity — RF-072.
 *
 * Sign-up pauses at **90% of a cumulative ceiling** (900 of the 1000 monthly
 * OCR calls), never at instantaneous occupancy: the 2026-09-11 audit found
 * that lobby occupancy was the wrong lever, because blocking new accounts
 * frees no lobby and punishes people unrelated to the spike. Capacity for
 * simultaneous lobbies pauses the *queue* instead (RNF-008).
 *
 * Reads a counter that nothing writes yet — OCR lands in phase 2.2. It exists
 * now because RF-019 declares the pause as an exception to open sign-up, and
 * an exception with no implementation is a rule that silently does not exist.
 * Wiring it later would mean revisiting the endpoint instead of this class.
 */
@Injectable()
export class CapacityService {
  /** 90% of 1000: ten percent of slack to react before hitting the hard cap. */
  private static readonly OCR_PAUSE_THRESHOLD = 900

  async isSignUpPaused(): Promise<boolean> {
    return (await this.monthlyOcrCalls()) >= CapacityService.OCR_PAUSE_THRESHOLD
  }

  /**
   * OCR calls used this month.
   *
   * Zero until phase 2.2 builds the counter. Deliberately a method, not a
   * constant: when the real source arrives, only this body changes, and no
   * caller has to be found again.
   */
  private async monthlyOcrCalls(): Promise<number> {
    return 0
  }
}
