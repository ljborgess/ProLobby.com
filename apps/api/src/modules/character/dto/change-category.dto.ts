import { IsEnum } from 'class-validator'

import { CharacterCategory } from '../archetype'

export class ChangeCategoryDto {
  @IsEnum(CharacterCategory)
  category!: CharacterCategory
}
