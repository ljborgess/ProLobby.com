import { Transform } from 'class-transformer'
import { IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator'

import { Platform } from '../../../common/domain/platform.enum'
import { Archetype, CharacterCategory } from '../archetype'

/**
 * `forbidNonWhitelisted` rejects anything not declared here: state, edition,
 * verification and match count are the server's, never the body's.
 */
export class CreateCharacterDto {
  @IsEnum(CharacterCategory)
  category!: CharacterCategory

  @IsEnum(Archetype)
  archetype!: Archetype

  @IsEnum(Platform)
  platform!: Platform

  /**
   * The tag of that platform. PSN (3–16), Xbox (up to 12 plus a `#1234`
   * suffix) and EA ID on PC all fit; spaces, `_ - .` show up in real tags.
   */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 20)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9 _.#-]*$/)
  gamertag!: string

  /**
   * Letters of any language, digits, space and `. _ -`: no control or
   * zero-width characters, which would let a name pass for someone else's.
   */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 40)
  @Matches(/^[\p{L}\p{N} ._-]+$/u)
  name?: string
}
