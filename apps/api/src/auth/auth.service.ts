import { HttpStatus, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EntityManager, FindOptionsWhere, IsNull, MoreThan } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'node:crypto';
import { verifyMessage } from 'ethers';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  AUTH_PROVIDER_ENUM,
  AuthTokens,
  CHAIN_NAMESPACE_ENUM,
  WalletChallenge,
} from '@recv/shared';
import { UserRepoService } from '../repo/core/user-repo.service';
import { AuthIdentityRepoService } from '../repo/core/auth-identity-repo.service';
import { OtpCodeRepoService } from '../repo/core/otp-code-repo.service';
import { AuthNonceRepoService } from '../repo/core/auth-nonce-repo.service';
import { RefreshTokenRepoService } from '../repo/core/refresh-token-repo.service';
import { PayoutAddressRepoService } from '../repo/core/payout-address-repo.service';
import { User } from '../repo/core/entities/user.entity';
import { AuthIdentity } from '../repo/core/entities/auth-identity.entity';
import { OtpCode } from '../repo/core/entities/otp-code.entity';
import { AuthNonce } from '../repo/core/entities/auth-nonce.entity';
import { RefreshToken } from '../repo/core/entities/refresh-token.entity';
import { Domain } from '../repo/core/entities/domain.entity';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { DomainService } from '../domain/domain.service';
import { MailerService } from '../mailer/mailer.service';
import { RateLimitService } from '../cache/rate-limit.service';
import { ResultWithError, JwtPayload } from '../common/interfaces';
import { GenericError } from '../common/errors/Generic.error';
import { Promisify } from '../common/helpers/promisifier';
import { normaliseAddress } from '../common/helpers/address.helper';
import { BucketSizes } from '../common/constants';

const ACCESS_SECRET_KEY = 'auth.accessToken.secret';
const REFRESH_SECRET_KEY = 'auth.refreshToken.secret';

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    @InjectEntityManager() private entityManager: EntityManager,
    private userRepo: UserRepoService,
    private authIdentityRepo: AuthIdentityRepoService,
    private otpCodeRepo: OtpCodeRepoService,
    private authNonceRepo: AuthNonceRepoService,
    private refreshTokenRepo: RefreshTokenRepoService,
    private payoutAddressRepo: PayoutAddressRepoService,
    private platformConfigService: PlatformConfigService,
    private domainService: DomainService,
    private mailerService: MailerService,
    private rateLimitService: RateLimitService,
  ) {}

  /**
   * A fresh install seeds both JWT secrets as empty placeholders (PC8). Rather
   * than fail every login until an admin sets them, generate per-install
   * secrets on first boot and store them encrypted. They never leave the DB.
   */
  async onModuleInit() {
    for (const key of [ACCESS_SECRET_KEY, REFRESH_SECRET_KEY]) {
      const { data } =
        await this.platformConfigService.getConfigByKey<string>(key);
      if (!data) {
        this.logger.warn(
          `[AuthService.onModuleInit] ${key} is empty — generating a per-install secret`,
        );
        await this.platformConfigService.setConfigByKey(
          key,
          crypto.randomBytes(48).toString('hex'),
        );
      }
    }
  }

  // ─── Email OTP ─────────────────────────────────────────────────────────────

  async requestOtp(
    email: string,
    host: string,
    ctx: RequestContext,
  ): Promise<ResultWithError> {
    try {
      const normalised = this.normaliseEmail(email);
      this.logger.info(`[AuthService.requestOtp] email: ${normalised}`);

      const perHour = await this.platformConfigService.getConfigOrDefault(
        'auth.otp.requestsPerHour',
        5,
      );
      await Promisify<boolean>(
        this.rateLimitService.hit('otp:email', normalised, perHour, 3600),
      );
      if (ctx.ip) {
        await Promisify<boolean>(
          this.rateLimitService.hit('otp:ip', ctx.ip, perHour * 4, 3600),
        );
      }

      const codeLength = await this.platformConfigService.getConfigOrDefault(
        'auth.otp.codeLength',
        6,
      );
      const ttlSeconds = await this.platformConfigService.getConfigOrDefault(
        'auth.otp.ttlSeconds',
        600,
      );

      const code = this.randomDigits(codeLength);
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const domain = await Promisify<Domain>(
        this.domainService.getByHost(host),
      );

      // A new request supersedes any code still in flight for this address
      // on this domain — domains are separate products.
      await this.otpCodeRepo.update(
        { Email: normalised, DomainID: domain.DomainID, ConsumedAt: IsNull() },
        { ConsumedAt: new Date() },
      );

      await Promisify<OtpCode>(
        this.otpCodeRepo.create({
          Email: normalised,
          DomainID: domain.DomainID,
          CodeHash: this.hashOtp(normalised, code),
          ExpiresAt: expiresAt,
          RequestIp: ctx.ip,
        }),
      );

      await Promisify<boolean>(
        this.mailerService.sendOtp({
          to: normalised,
          code,
          brandName: domain.BrandName,
          host: domain.Host,
          ttlMinutes: Math.round(ttlSeconds / 60),
        }),
      );

      return { data: { sent: true }, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthService.requestOtp] error for ${email}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async verifyOtp(
    email: string,
    code: string,
    host: string,
    ctx: RequestContext,
    linkToUserId?: number,
  ): Promise<ResultWithError> {
    try {
      const normalised = this.normaliseEmail(email);
      this.logger.info(`[AuthService.verifyOtp] email: ${normalised}`);

      const domain = await Promisify<Domain>(
        this.domainService.getByHost(host),
      );

      const maxAttempts = await this.platformConfigService.getConfigOrDefault(
        'auth.otp.maxVerifyAttempts',
        5,
      );

      const where: FindOptionsWhere<OtpCode> = {
        Email: normalised,
        DomainID: domain.DomainID,
        ConsumedAt: IsNull(),
        ExpiresAt: MoreThan(new Date()),
      };
      const otp = await Promisify<OtpCode>(
        this.otpCodeRepo.get({ where, order: { CreatedAt: 'DESC' } }, false),
      );
      if (!otp)
        throw new GenericError(
          'Code expired or not requested',
          HttpStatus.UNAUTHORIZED,
        );

      if (otp.Attempts + 1 >= maxAttempts) {
        // Burn the code on the final wrong guess so it can't be brute-forced.
        await this.otpCodeRepo.update(
          { OtpCodeID: otp.OtpCodeID },
          { Attempts: otp.Attempts + 1, ConsumedAt: new Date() },
        );
      } else {
        await this.otpCodeRepo.update(
          { OtpCodeID: otp.OtpCodeID },
          { Attempts: otp.Attempts + 1 },
        );
      }

      const expected = Buffer.from(this.hashOtp(normalised, code.trim()));
      const actual = Buffer.from(otp.CodeHash);
      if (
        expected.length !== actual.length ||
        !crypto.timingSafeEqual(expected, actual)
      ) {
        throw new GenericError('Incorrect code', HttpStatus.UNAUTHORIZED);
      }

      await this.otpCodeRepo.update(
        { OtpCodeID: otp.OtpCodeID },
        { ConsumedAt: new Date() },
      );

      const user = await Promisify<User>(
        this.resolveUserForIdentity(
          AUTH_PROVIDER_ENUM.EMAIL,
          normalised,
          null,
          domain,
          linkToUserId,
        ),
      );

      const tokens = await Promisify<AuthTokens>(this.issueTokens(user, ctx));
      return { data: { tokens, userName: user.UserName }, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthService.verifyOtp] error for ${email}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  // ─── Wallet ────────────────────────────────────────────────────────────────

  async getNonce(
    address: string,
    namespace: CHAIN_NAMESPACE_ENUM,
    host: string,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`[AuthService.getNonce] ${namespace}:${address}`);

      if (
        namespace !== CHAIN_NAMESPACE_ENUM.EIP155 &&
        namespace !== CHAIN_NAMESPACE_ENUM.SOLANA
      ) {
        throw new GenericError(
          'Wallet sign-in supports EVM and Solana wallets',
          HttpStatus.BAD_REQUEST,
        );
      }

      const canonical = normaliseAddress(namespace, address);
      const ttlSeconds = await this.platformConfigService.getConfigOrDefault(
        'auth.nonce.ttlSeconds',
        300,
      );
      const domain = await Promisify<Domain>(
        this.domainService.getByHost(host),
      );

      const nonce = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await Promisify<AuthNonce>(
        this.authNonceRepo.create({
          Address: canonical,
          Namespace: namespace,
          Nonce: nonce,
          ExpiresAt: expiresAt,
        }),
      );

      const message = [
        `${domain.BrandName} wants you to sign in with your wallet.`,
        '',
        `Address: ${canonical}`,
        `Nonce: ${nonce}`,
        `Issued: ${new Date().toISOString()}`,
        '',
        'This request will not trigger a blockchain transaction or cost any gas.',
      ].join('\n');

      const challenge: WalletChallenge = {
        nonce,
        message,
        expiresAt: expiresAt.toISOString(),
      };
      return { data: challenge, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthService.getNonce] error for ${address}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  async walletLogin(
    address: string,
    namespace: CHAIN_NAMESPACE_ENUM,
    message: string,
    signature: string,
    host: string,
    ctx: RequestContext,
    linkToUserId?: number,
  ): Promise<ResultWithError> {
    try {
      this.logger.info(`[AuthService.walletLogin] ${namespace}:${address}`);

      const canonical = normaliseAddress(namespace, address);
      await Promisify<boolean>(
        this.verifyChallenge(canonical, namespace, message, signature),
      );

      const domain = await Promisify<Domain>(
        this.domainService.getByHost(host),
      );

      const user = await Promisify<User>(
        this.resolveUserForIdentity(
          AUTH_PROVIDER_ENUM.WALLET,
          canonical,
          namespace,
          domain,
          linkToUserId,
        ),
      );

      // A wallet that has signed for us is proven; mark any matching payout
      // address so the pay page can show the badge.
      await this.payoutAddressRepo.update(
        {
          User: { UserID: user.UserID },
          Namespace: namespace,
          Address: canonical,
        },
        { IsProven: true },
      );

      const tokens = await Promisify<AuthTokens>(this.issueTokens(user, ctx));
      return { data: { tokens, userName: user.UserName }, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthService.walletLogin] error for ${address}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  // ─── Tokens ────────────────────────────────────────────────────────────────

  async verifyAccessToken(token: string): Promise<ResultWithError> {
    try {
      const secret = await Promisify<string>(
        this.platformConfigService.getConfigByKey<string>(ACCESS_SECRET_KEY),
      );
      const payload = jwt.verify(token, secret) as JwtPayload;
      if (!payload?.userId)
        throw new GenericError('Invalid token', HttpStatus.UNAUTHORIZED);

      const user = await Promisify<User>(
        this.userRepo.get(
          { where: { UserID: payload.userId, IsActive: true } },
          false,
        ),
      );
      if (!user)
        throw new GenericError('User not found', HttpStatus.UNAUTHORIZED);

      return { data: payload, error: null };
    } catch (error) {
      const wrapped =
        error instanceof GenericError
          ? error
          : new GenericError(error.message, HttpStatus.UNAUTHORIZED);
      return { data: null, error: wrapped };
    }
  }

  async refresh(
    rawRefreshToken: string,
    ctx: RequestContext,
  ): Promise<ResultWithError> {
    try {
      this.logger.info('[AuthService.refresh] rotating refresh token');

      const stored = await Promisify<RefreshToken>(
        this.refreshTokenRepo.get(
          {
            where: { TokenHash: this.hashToken(rawRefreshToken) },
            relations: { User: true },
          },
          false,
        ),
      );
      if (!stored)
        throw new GenericError(
          'Invalid refresh token',
          HttpStatus.UNAUTHORIZED,
        );

      if (stored.RevokedAt) {
        // Reuse of a rotated token means it leaked. Kill the whole family.
        await this.refreshTokenRepo.update(
          { FamilyID: stored.FamilyID, RevokedAt: IsNull() },
          { RevokedAt: new Date() },
        );
        throw new GenericError(
          'Refresh token reuse detected — please sign in again',
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (stored.ExpiresAt.getTime() < Date.now())
        throw new GenericError(
          'Refresh token expired',
          HttpStatus.UNAUTHORIZED,
        );

      await this.refreshTokenRepo.update(
        { RefreshTokenID: stored.RefreshTokenID },
        { RevokedAt: new Date() },
      );

      const tokens = await Promisify<AuthTokens>(
        this.issueTokens(stored.User, ctx, stored.FamilyID),
      );
      return { data: { tokens, userName: stored.User.UserName }, error: null };
    } catch (error) {
      this.logger.error(`[AuthService.refresh] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  async logout(rawRefreshToken?: string): Promise<ResultWithError> {
    try {
      this.logger.info('[AuthService.logout] revoking refresh token');
      if (rawRefreshToken) {
        await this.refreshTokenRepo.update(
          { TokenHash: this.hashToken(rawRefreshToken), RevokedAt: IsNull() },
          { RevokedAt: new Date() },
        );
      }
      return { data: true, error: null };
    } catch (error) {
      this.logger.error(`[AuthService.logout] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private async issueTokens(
    user: User,
    ctx: RequestContext,
    familyId?: string,
  ): Promise<ResultWithError> {
    try {
      const accessSecret = await Promisify<string>(
        this.platformConfigService.getConfigByKey<string>(ACCESS_SECRET_KEY),
      );
      const accessExpiresIn =
        await this.platformConfigService.getConfigOrDefault(
          'auth.accessToken.expiresIn',
          '15m',
        );
      const refreshExpiresIn =
        await this.platformConfigService.getConfigOrDefault(
          'auth.refreshToken.expiresIn',
          '30d',
        );

      const payload: JwtPayload = { userId: user.UserID };
      const accessToken = jwt.sign(payload, accessSecret, {
        expiresIn: accessExpiresIn as jwt.SignOptions['expiresIn'],
      });

      const raw = crypto.randomBytes(48).toString('base64url');
      await Promisify<RefreshToken>(
        this.refreshTokenRepo.create({
          User: user,
          TokenHash: this.hashToken(raw),
          FamilyID: familyId ?? crypto.randomBytes(16).toString('hex'),
          ExpiresAt: new Date(
            Date.now() + this.parseDuration(refreshExpiresIn),
          ),
          UserAgent: ctx.userAgent?.slice(0, 512),
          Ip: ctx.ip,
        }),
      );

      const tokens: AuthTokens = {
        accessToken,
        refreshToken: raw,
        accessTokenExpiresIn: accessExpiresIn,
      };
      return { data: tokens, error: null };
    } catch (error) {
      this.logger.error(`[AuthService.issueTokens] error: ${error.stack}`);
      return { data: null, error };
    }
  }

  /**
   * Finds the user behind an identity on one domain, creating one when it is
   * new — domains are separate products, so the same email or wallet on
   * another domain is a different account. When a signed-in user is linking,
   * the identity must be unclaimed — we never silently merge two accounts.
   */
  private async resolveUserForIdentity(
    provider: AUTH_PROVIDER_ENUM,
    identifier: string,
    namespace: CHAIN_NAMESPACE_ENUM,
    domain: Domain,
    linkToUserId?: number,
  ): Promise<ResultWithError> {
    try {
      const existing = await Promisify<AuthIdentity>(
        this.authIdentityRepo.get(
          {
            where: {
              Provider: provider,
              Identifier: identifier,
              DomainID: domain.DomainID,
            },
            relations: { User: true },
          },
          false,
        ),
      );

      if (existing) {
        if (linkToUserId && existing.User.UserID !== linkToUserId) {
          throw new GenericError(
            'That identity is already linked to another account',
            HttpStatus.CONFLICT,
          );
        }
        if (!existing.User.IsActive)
          throw new GenericError('Account is disabled', HttpStatus.FORBIDDEN);
        return { data: existing.User, error: null };
      }

      let user: User;
      await this.entityManager.transaction(async (tm) => {
        if (linkToUserId) {
          user = await tm.findOneOrFail(User, {
            where: { UserID: linkToUserId },
          });
          if (user.DomainID !== domain.DomainID)
            throw new GenericError(
              'That account belongs to a different domain',
              HttpStatus.CONFLICT,
            );
        } else {
          user = await tm.save(tm.create(User, { Domain: domain }));
        }

        const isFirst =
          (await tm.count(AuthIdentity, {
            where: { User: { UserID: user.UserID } },
          })) === 0;

        await tm.save(
          tm.create(AuthIdentity, {
            User: user,
            Domain: domain,
            Provider: provider,
            Identifier: identifier,
            Namespace: namespace,
            IsPrimary: isFirst,
            VerifiedAt: new Date(),
          }),
        );
      });

      return { data: user, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthService.resolveUserForIdentity] error for ${provider}:${identifier}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  private async verifyChallenge(
    address: string,
    namespace: CHAIN_NAMESPACE_ENUM,
    message: string,
    signature: string,
  ): Promise<ResultWithError> {
    try {
      const nonceMatch = message.match(/Nonce: ([0-9a-f]{32})/);
      if (!nonceMatch)
        throw new GenericError('Message has no nonce', HttpStatus.BAD_REQUEST);
      if (!message.includes(`Address: ${address}`))
        throw new GenericError(
          'Message was issued for a different address',
          HttpStatus.BAD_REQUEST,
        );

      const nonce = await Promisify<AuthNonce>(
        this.authNonceRepo.get(
          {
            where: {
              Nonce: nonceMatch[1],
              Address: address,
              Namespace: namespace,
              ConsumedAt: IsNull(),
              ExpiresAt: MoreThan(new Date()),
            },
          },
          false,
        ),
      );
      if (!nonce)
        throw new GenericError(
          'Challenge expired or already used',
          HttpStatus.UNAUTHORIZED,
        );

      let valid = false;
      if (namespace === CHAIN_NAMESPACE_ENUM.EIP155) {
        const recovered = verifyMessage(message, signature);
        valid = recovered.toLowerCase() === address.toLowerCase();
      } else if (namespace === CHAIN_NAMESPACE_ENUM.SOLANA) {
        const sig = bs58.decode(signature);
        const pub = bs58.decode(address);
        valid =
          sig.length === nacl.sign.signatureLength &&
          pub.length === nacl.sign.publicKeyLength &&
          nacl.sign.detached.verify(
            new TextEncoder().encode(message),
            sig,
            pub,
          );
      }

      if (!valid)
        throw new GenericError('Invalid signature', HttpStatus.UNAUTHORIZED);

      await this.authNonceRepo.update(
        { AuthNonceID: nonce.AuthNonceID },
        { ConsumedAt: new Date() },
      );

      return { data: true, error: null };
    } catch (error) {
      this.logger.error(
        `[AuthService.verifyChallenge] error for ${address}: ${error.stack}`,
      );
      return { data: null, error };
    }
  }

  private normaliseEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  private randomDigits(length: number): string {
    let out = '';
    while (out.length < length) out += crypto.randomInt(0, 10).toString();
    return out;
  }

  private hashOtp(email: string, code: string): string {
    return crypto.createHash('sha256').update(`${email}:${code}`).digest('hex');
  }

  private hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return Number(BucketSizes.ONE_DAY) * 30;
    const n = Number(match[1]);
    const unit = {
      s: Number(BucketSizes.ONE_SECOND),
      m: Number(BucketSizes.ONE_MINUTE),
      h: Number(BucketSizes.ONE_HOUR),
      d: Number(BucketSizes.ONE_DAY),
    }[match[2]];
    return n * unit;
  }
}
