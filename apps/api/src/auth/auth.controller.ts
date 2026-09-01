import {
  Body,
  Controller,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Request, Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthTokens, WalletChallenge } from '@recv/shared';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { AuthService } from './auth.service';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import {
  GetNonceDto,
  LogoutDto,
  RefreshDto,
  RequestOtpDto,
  VerifyOtpDto,
  WalletLoginDto,
} from './dto/auth.dto';

interface LoginResult {
  tokens: AuthTokens;
  userName?: string;
}

const ctxOf = (req: Request) => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private authService: AuthService,
  ) {}

  @Post('requestOtp')
  @ApiOperation({ summary: 'Email a one-time code' })
  @ApiOkResponseGeneric({ description: 'Code sent', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to send code' })
  async requestOtp(
    @Body() data: RequestOtpDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'If that address exists, a code is on its way';
    let resData = null;
    let resSuccess = true;
    try {
      await Promisify<{ sent: boolean }>(
        this.authService.requestOtp(data.email, data.host, ctxOf(req)),
      );
      resData = { sent: true };
    } catch (error) {
      this.logger.error(
        `Error in requesting otp [email: ${data.email}]: ${error.stack}`,
      );
      // Rate limits surface; everything else stays opaque so the endpoint
      // cannot be used to enumerate accounts.
      if (error?.status === HttpStatus.TOO_MANY_REQUESTS) {
        resStatus = error.status;
        resMessage = error.message;
        resSuccess = false;
      } else {
        resData = { sent: true };
      }
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('verifyOtp')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary:
      'Exchange a code for tokens. With a bearer token, links the email instead',
  })
  @ApiOkResponseGeneric({ description: 'Signed in', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to verify code' })
  async verifyOtp(
    @Body() data: VerifyOtpDto,
    @Req() req: Request & { userId?: number },
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Signed in';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<LoginResult>(
        this.authService.verifyOtp(
          data.email,
          data.code,
          ctxOf(req),
          req.userId,
        ),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in verifying otp [email: ${data.email}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to verify code: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('getNonce')
  @ApiOperation({ summary: 'Get a sign-in challenge for a wallet' })
  @ApiOkResponseGeneric({
    description: 'Challenge issued',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to issue challenge' })
  async getNonce(@Body() data: GetNonceDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Challenge issued';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<WalletChallenge>(
        this.authService.getNonce(data.address, data.namespace, data.host),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in issuing nonce [address: ${data.address}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to issue challenge: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('walletLogin')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary:
      'Sign in with a signed challenge. With a bearer token, links the wallet instead',
  })
  @ApiOkResponseGeneric({ description: 'Signed in', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to sign in' })
  async walletLogin(
    @Body() data: WalletLoginDto,
    @Req() req: Request & { userId?: number },
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Signed in';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<LoginResult>(
        this.authService.walletLogin(
          data.address,
          data.namespace,
          data.message,
          data.signature,
          ctxOf(req),
          req.userId,
        ),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in wallet login [address: ${data.address}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to sign in: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token' })
  @ApiOkResponseGeneric({
    description: 'Tokens refreshed',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to refresh' })
  async refresh(
    @Body() data: RefreshDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Tokens refreshed';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<LoginResult>(
        this.authService.refresh(data.refreshToken, ctxOf(req)),
      );
      resData = result;
    } catch (error) {
      this.logger.error(`Error in refreshing tokens: ${error.stack}`);
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to refresh: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('logout')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  @ApiOkResponseGeneric({ description: 'Signed out', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to sign out' })
  async logout(@Body() data: LogoutDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Signed out';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<boolean>(
        this.authService.logout(data.refreshToken),
      );
      resData = { revoked: result };
    } catch (error) {
      this.logger.error(`Error in logout: ${error.stack}`);
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to sign out: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
