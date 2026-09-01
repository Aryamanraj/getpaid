import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Post,
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
  ApiTags,
} from '@nestjs/swagger';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { PlatformConfigService } from './platform-config.service';
import { PlatformConfigRepoService } from '../repo/core/platform-config-repo.service';
import { PlatformConfig } from '../repo/core/entities/platform-config.entity';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { SetPlatformConfigDto } from './dto/set-platform-config.dto';

@Controller('platformConfig')
@ApiTags('Platform Config')
export class PlatformConfigController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private platformConfigService: PlatformConfigService,
    private platformConfigRepo: PlatformConfigRepoService,
  ) {}

  @Get('getAll')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({
    summary: 'List every config key. Secret values are never returned',
  })
  @ApiOkResponseGeneric({
    description: 'Fetched platform config',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch platform config' })
  async getAll(@Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched platform config';
    let resData = null;
    let resSuccess = true;
    try {
      const rows = await Promisify<PlatformConfig[]>(
        this.platformConfigRepo.getAll({ order: { Key: 'ASC' } }, false),
      );

      // Secrets are write-only through the API: you can set one, you cannot
      // read one back.
      resData = (rows ?? []).map((row) => ({
        key: row.Key,
        value: row.IsSecret ? '[secret]' : row.Value,
        description: row.Description,
        isSecret: row.IsSecret,
        isPublic: row.IsPublic,
        cacheTtlSeconds: row.CacheTtlSeconds,
        isActive: row.IsActive,
        updatedAt: row.UpdatedAt,
      }));
    } catch (error) {
      this.logger.error(`Error in fetching platform config: ${error.stack}`);
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch platform config: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('set')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({ summary: 'Set one config value' })
  @ApiOkResponseGeneric({
    description: 'Updated platform config',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to update platform config' })
  async set(@Body() data: SetPlatformConfigDto, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Updated platform config';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<boolean>(
        this.platformConfigService.setConfigByKey(data.key, data.value),
      );
      resData = { key: data.key, updated: result };
    } catch (error) {
      // CT8 — the value may be a secret, so only the key is ever logged.
      this.logger.error(
        `Error in updating platform config [key: ${data?.key}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update platform config: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
