import { Matches } from 'class-validator'

export class AcceptTermsDto {
  /**
   * The version the person was shown. Must be the current one — see
   * AccountService.acceptTerms for why an older version is refused.
   */
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  version!: string
}
