import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Domain } from './core/entities/domain.entity';
import { DomainRepoService } from './core/domain-repo.service';
import { User } from './core/entities/user.entity';
import { UserRepoService } from './core/user-repo.service';
import { ReservedUserName } from './core/entities/reserved-user-name.entity';
import { ReservedUserNameRepoService } from './core/reserved-user-name-repo.service';
import { AuthIdentity } from './core/entities/auth-identity.entity';
import { AuthIdentityRepoService } from './core/auth-identity-repo.service';
import { OtpCode } from './core/entities/otp-code.entity';
import { OtpCodeRepoService } from './core/otp-code-repo.service';
import { AuthNonce } from './core/entities/auth-nonce.entity';
import { AuthNonceRepoService } from './core/auth-nonce-repo.service';
import { RefreshToken } from './core/entities/refresh-token.entity';
import { RefreshTokenRepoService } from './core/refresh-token-repo.service';
import { Chain } from './core/entities/chain.entity';
import { ChainRepoService } from './core/chain-repo.service';
import { Asset } from './core/entities/asset.entity';
import { AssetRepoService } from './core/asset-repo.service';
import { PayoutAddress } from './core/entities/payout-address.entity';
import { PayoutAddressRepoService } from './core/payout-address-repo.service';
import { AcceptedAsset } from './core/entities/accepted-asset.entity';
import { AcceptedAssetRepoService } from './core/accepted-asset-repo.service';
import { PaymentMethod } from './core/entities/payment-method.entity';
import { PaymentMethodRepoService } from './core/payment-method-repo.service';
import { PaymentRequest } from './core/entities/payment-request.entity';
import { PaymentRequestRepoService } from './core/payment-request-repo.service';
import { PaymentTransaction } from './core/entities/payment-transaction.entity';
import { PaymentTransactionRepoService } from './core/payment-transaction-repo.service';
import { PlatformConfig } from './core/entities/platform-config.entity';
import { PlatformConfigRepoService } from './core/platform-config-repo.service';
import { VerificationJob } from './ops/entities/verification-job.entity';
import { VerificationJobRepoService } from './ops/verification-job-repo.service';
import { VerificationAttempt } from './ops/entities/verification-attempt.entity';
import { VerificationAttemptRepoService } from './ops/verification-attempt-repo.service';
import { AdminActionLog } from './ops/entities/admin-action-log.entity';
import { AdminActionLogRepoService } from './ops/admin-action-log-repo.service';
import { BlogArticle } from './blogs/entities/blog-article.entity';
import { BlogArticleRepoService } from './blogs/blog-article-repo.service';

export const entities = [
  // core
  Domain,
  User,
  ReservedUserName,
  AuthIdentity,
  OtpCode,
  AuthNonce,
  RefreshToken,
  Chain,
  Asset,
  PayoutAddress,
  AcceptedAsset,
  PaymentMethod,
  PaymentRequest,
  PaymentTransaction,
  PlatformConfig,
  // ops
  VerificationJob,
  VerificationAttempt,
  AdminActionLog,
  // blogs — owned by the newsmith pipeline, read-only here
  BlogArticle,
];

const repoServices = [
  // core
  DomainRepoService,
  UserRepoService,
  ReservedUserNameRepoService,
  AuthIdentityRepoService,
  OtpCodeRepoService,
  AuthNonceRepoService,
  RefreshTokenRepoService,
  ChainRepoService,
  AssetRepoService,
  PayoutAddressRepoService,
  AcceptedAssetRepoService,
  PaymentMethodRepoService,
  PaymentRequestRepoService,
  PaymentTransactionRepoService,
  PlatformConfigRepoService,
  // ops
  VerificationJobRepoService,
  VerificationAttemptRepoService,
  AdminActionLogRepoService,
  // blogs
  BlogArticleRepoService,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  providers: repoServices,
  exports: repoServices,
})
export class RepoModule {}
