import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BootstrapPayload } from '@recv/shared';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { DomainService } from './domain.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';

@Controller('config')
@ApiTags('Config')
export class DomainController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private domainService: DomainService,
  ) {}

  @Get('getBootstrap')
  @ApiOperation({
    summary:
      'Branding, theme, features, public config and the chain/asset registry for a host',
  })
  @ApiQuery({ name: 'host', example: 'payee.id' })
  @ApiOkResponseGeneric({
    description: 'Fetched bootstrap payload',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch bootstrap payload' })
  async getBootstrap(@Query('host') host: string, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched bootstrap payload';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<BootstrapPayload>(
        this.domainService.getBootstrap(host),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in fetching bootstrap payload [host: ${host}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch bootstrap payload: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('invalidateBootstrap')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({
    summary: 'Drop the cached bootstrap payloads after a domain edit',
  })
  @ApiOkResponseGeneric({
    description: 'Invalidated bootstrap cache',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({
    description: 'Failed to invalidate bootstrap cache',
  })
  async invalidateBootstrap(@Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Invalidated bootstrap cache';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<boolean>(
        this.domainService.invalidateBootstrap(),
      );
      resData = { invalidated: result };
    } catch (error) {
      this.logger.error(
        `Error in invalidating bootstrap cache: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to invalidate bootstrap cache: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
