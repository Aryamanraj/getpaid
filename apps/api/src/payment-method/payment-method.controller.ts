import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
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
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { PaymentMethodService } from './payment-method.service';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import {
  AddPayoutAddressDto,
  SetAcceptedAssetDto,
} from './dto/payment-method.dto';

type AuthedRequest = Request & { userId: number };

@Controller('paymentMethod')
@ApiTags('Payment Method')
export class PaymentMethodController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private paymentMethodService: PaymentMethodService,
  ) {}

  @Get('getAll')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Payout addresses and accepted assets' })
  @ApiOkResponseGeneric({
    description: 'Fetched payment methods',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch payment methods' })
  async getAll(@Req() req: AuthedRequest, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched payment methods';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(
        this.paymentMethodService.listForUser(req.userId),
      );
    } catch (error) {
      this.logger.error(
        `Error in fetching payment methods [user: ${req.userId}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch payment methods: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('addPayoutAddress')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Add a payout address, optionally accepting assets at it',
  })
  @ApiOkResponseGeneric({
    description: 'Added payout address',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to add payout address' })
  async addPayoutAddress(
    @Body() data: AddPayoutAddressDto,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Added payout address';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(
        this.paymentMethodService.addPayoutAddress(req.userId, data),
      );
    } catch (error) {
      this.logger.error(
        `Error in adding payout address [user: ${req.userId}, namespace: ${data.namespace}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to add payout address: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Delete('removePayoutAddress/:id')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Deactivate a payout address and its accepted assets',
  })
  @ApiOkResponseGeneric({
    description: 'Removed payout address',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to remove payout address' })
  async removePayoutAddress(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Removed payout address';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(
        this.paymentMethodService.removePayoutAddress(req.userId, id),
      );
    } catch (error) {
      this.logger.error(
        `Error in removing payout address [user: ${req.userId}, id: ${id}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to remove payout address: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('setAcceptedAsset')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Accept (or stop accepting) an asset at a payout address',
  })
  @ApiOkResponseGeneric({
    description: 'Updated accepted asset',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to update accepted asset' })
  async setAcceptedAsset(
    @Body() data: SetAcceptedAssetDto,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Updated accepted asset';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(
        this.paymentMethodService.setAcceptedAsset(req.userId, data),
      );
    } catch (error) {
      this.logger.error(
        `Error in setting accepted asset [user: ${req.userId}, asset: ${data.assetId}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update accepted asset: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
