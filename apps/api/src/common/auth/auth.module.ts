import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { HashService } from './hash.service'
import { MIN_JWT_SECRET_LENGTH, SESSION_TTL_SECONDS } from './session.constants'

/**
 * Signing and hashing, available everywhere.
 *
 * Global because the session guard runs on every route and cannot depend on
 * each module remembering to import this. The JWT secret is read once, at
 * boot: a missing secret must stop the process rather than let it serve
 * requests with tokens nobody can trust.
 */
@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET

        if (!secret || secret === 'changeme' || secret.length < MIN_JWT_SECRET_LENGTH) {
          throw new Error(
            `JWT_SECRET is required, must not be the placeholder and needs at least ${MIN_JWT_SECRET_LENGTH} characters — it forges sessions for any account, including Admin (RNF-021)`,
          )
        }

        return { secret, signOptions: { expiresIn: SESSION_TTL_SECONDS } }
      },
    }),
  ],
  providers: [HashService],
  exports: [JwtModule, HashService],
})
export class AuthModule {}
