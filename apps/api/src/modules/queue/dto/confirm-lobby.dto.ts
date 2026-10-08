import { IsBoolean } from 'class-validator'

export class ConfirmLobbyDto {
  @IsBoolean()
  accept!: boolean
}
