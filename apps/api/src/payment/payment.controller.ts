import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentRequestView, TX_SUBMISSION_ENUM } from '@recv/shared';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { PaymentService } from './payment.service';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { RateLimitService } from '../cache/rate-limit.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import {
  CreatePaymentRequestDto,
  SubmitTransactionDto,
} from './dto/payment.dto';

type AuthedRequest = Request & { userId: number };

@Controller('payment')
@ApiTags('Payment')
export class PaymentController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private paymentService: PaymentService,
    private rateLimitService: RateLimitService,
    private platformConfigService: PlatformConfigService,
  ) {}

  @Post('createRequest')
  @ApiOperation({ summary: 'Create a payment request against a payee' })
  @ApiOkResponseGeneric({
    description: 'Created payment request',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to create payment request' })
  async createRequest(
    @Body() data: CreatePaymentRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Created payment request';
    let resData = null;
    let resSuccess = true;
    try {
      const limit = await this.platformConfigService.getConfigOrDefault(
        'rateLimit.createRequest.perMinute',
        20,
      );
      await Promisify<boolean>(
        this.rateLimitService.hit(
          'createRequest',
          req.ip ?? 'unknown',
          limit,
          60,
        ),
      );
      resData = await Promisify<PaymentRequestView>(
        this.paymentService.createRequest(data),
      );
    } catch (error) {
      this.logger.error(
        `Error in creating payment request [payee: ${data.userName}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to create payment request: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('getRequest/:publicId')
  @ApiOperation({
    summary: 'A payment request and its latest transaction. Public',
  })
  @ApiOkResponseGeneric({
    description: 'Fetched payment request',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch payment request' })
  async getRequest(@Param('publicId') publicId: string, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched payment request';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<PaymentRequestView>(
        this.paymentService.getRequest(publicId),
      );
    } catch (error) {
      this.logger.error(
        `Error in fetching payment request [publicId: ${publicId}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch payment request: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('submitTransaction')
  @ApiOperation({
    summary: 'Attach a transaction hash to a request and queue verification',
  })
  @ApiOkResponseGeneric({
    description: 'Submitted transaction',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to submit transaction' })
  async submitTransaction(
    @Body() data: SubmitTransactionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Submitted transaction';
    let resData = null;
    let resSuccess = true;
    try {
      const limit = await this.platformConfigService.getConfigOrDefault(
        'rateLimit.submitTransaction.perMinute',
        10,
      );
      await Promisify<boolean>(
        this.rateLimitService.hit(
          'submitTransaction',
          req.ip ?? 'unknown',
          limit,
          60,
        ),
      );
      resData = await Promisify<PaymentRequestView>(
        this.paymentService.submitTransaction(
          data.publicId,
          data.txHash,
          data.submittedVia === 'wallet'
            ? TX_SUBMISSION_ENUM.WALLET
            : TX_SUBMISSION_ENUM.MANUAL,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error in submitting transaction [publicId: ${data.publicId}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to submit transaction: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('getMyRequests')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Payment history for the signed-in payee' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiOkResponseGeneric({
    description: 'Fetched payment history',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch payment history' })
  async getMyRequests(
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched payment history';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(
        this.paymentService.listForPayee(
          req.userId,
          Number(limit) || 50,
          Number(offset) || 0,
        ),
      );
    } catch (error) {
      this.logger.error(
        `Error in fetching payment history [user: ${req.userId}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch payment history: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
