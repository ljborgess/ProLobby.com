import { IsString, Length } from 'class-validator'

/**
 * Opens an appeal against the account's own punishment — RF-081, RF-037.
 *
 * A minimum length, not just non-empty: a moderator reviews this by hand,
 * and "não concordo" gives them nothing to act on. Not a hard content
 * requirement — just enough friction that an empty or one-word appeal isn't
 * the path of least resistance.
 */
export class OpenPunishmentAppealDto {
  @IsString()
  @Length(20, 2000)
  message!: string
}
