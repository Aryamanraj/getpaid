import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  ParseIntPipe,
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
  ApiTags,
} from '@nestjs/swagger';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { SetActiveDto, UpsertDomainDto } from './dto/admin.dto';

@Controller('admin')
@ApiTags('Admin')
export class AdminController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private adminService: AdminService,
  ) {}

  @Get('domains')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({ summary: 'List domains' })
  @ApiOkResponseGeneric({
    description: 'Fetched domains',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch domains' })
  async listDomains(@Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched domains';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(this.adminService.listDomains());
    } catch (error) {
      this.logger.error(`Error in listing domains: ${error.stack}`);
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch domains: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('domains/upsert')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({
    summary: 'Create or update a domain. New domain = DNS + this call',
  })
  @ApiOkResponseGeneric({
    description: 'Upserted domain',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to upsert domain' })
  async upsertDomain(
    @Body() data: UpsertDomainDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Upserted domain';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(
        this.adminService.upsertDomain(data, req.ip),
      );
    } catch (error) {
      this.logger.error(
        `Error in upserting domain [host: ${data.host}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to upsert domain: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('registry')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({ summary: 'Chains and assets, including inactive' })
  @ApiOkResponseGeneric({
    description: 'Fetched registry',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch registry' })
  async listRegistry(@Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched registry';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(this.adminService.listRegistry());
    } catch (error) {
      this.logger.error(`Error in listing registry: ${error.stack}`);
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch registry: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('chains/setActive')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({ summary: 'Enable or disable a chain' })
  @ApiOkResponseGeneric({ description: 'Updated chain', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to update chain' })
  async setChainActive(
    @Body() data: SetActiveDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Updated chain';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<boolean>(
        this.adminService.setChainActive(data.id, data.isActive, req.ip),
      );
    } catch (error) {
      this.logger.error(
        `Error in updating chain [id: ${data.id}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update chain: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('assets/setActive')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({ summary: 'Enable or disable an asset' })
  @ApiOkResponseGeneric({ description: 'Updated asset', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to update asset' })
  async setAssetActive(
    @Body() data: SetActiveDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Updated asset';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<boolean>(
        this.adminService.setAssetActive(data.id, data.isActive, req.ip),
      );
    } catch (error) {
      this.logger.error(
        `Error in updating asset [id: ${data.id}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update asset: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('users/setActive')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({ summary: 'Disable or re-enable a user' })
  @ApiOkResponseGeneric({ description: 'Updated user', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to update user' })
  async setUserActive(
    @Body() data: SetActiveDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Updated user';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<boolean>(
        this.adminService.setUserActive(data.id, data.isActive, req.ip),
      );
    } catch (error) {
      this.logger.error(
        `Error in updating user [id: ${data.id}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update user: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('verificationJobs')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({ summary: 'Recent verification jobs' })
  @ApiOkResponseGeneric({ description: 'Fetched jobs', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to fetch jobs' })
  async listVerificationJobs(
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched jobs';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<unknown>(
        this.adminService.listVerificationJobs(Number(limit) || 50),
      );
    } catch (error) {
      this.logger.error(`Error in listing verification jobs: ${error.stack}`);
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch jobs: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('verificationJobs/:id/requeue')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth('Api-auth')
  @ApiOperation({ summary: 'Put a failed job back on the queue' })
  @ApiOkResponseGeneric({ description: 'Requeued job', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to requeue job' })
  async requeue(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Requeued job';
    let resData = null;
    let resSuccess = true;
    try {
      resData = await Promisify<boolean>(
        this.adminService.requeueVerificationJob(id, req.ip),
      );
    } catch (error) {
      this.logger.error(`Error in requeueing job [id: ${id}]: ${error.stack}`);
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to requeue job: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
