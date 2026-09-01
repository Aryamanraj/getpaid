import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Patch,
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
import { MeResponse, PublicProfile } from '@recv/shared';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { UserService } from './user.service';
import { UserAuthGuard } from '../auth/guards/user-auth.guard';
import { RateLimitService } from '../cache/rate-limit.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { ClaimUserNameDto, UpdateProfileDto } from './dto/user.dto';

type AuthedRequest = Request & { userId: number };

@Controller('user')
@ApiTags('User')
export class UserController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private userService: UserService,
    private rateLimitService: RateLimitService,
    private platformConfigService: PlatformConfigService,
  ) {}

  @Get('checkUserName')
  @ApiOperation({ summary: 'Is this username available?' })
  @ApiQuery({ name: 'userName', example: 'aryaman' })
  @ApiOkResponseGeneric({ description: 'Checked', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to check' })
  async checkUserName(
    @Query('userName') userName: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Checked';
    let resData = null;
    let resSuccess = true;
    try {
      const limit = await this.platformConfigService.getConfigOrDefault(
        'rateLimit.checkUsername.perMinute',
        30,
      );
      await Promisify<boolean>(
        this.rateLimitService.hit(
          'checkUserName',
          req.ip ?? 'unknown',
          limit,
          60,
        ),
      );
      const result = await Promisify<{ available: boolean; reason?: string }>(
        this.userService.checkUserName(userName ?? ''),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in checking username [userName: ${userName}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to check: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Post('claimUserName')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Claim a username for the signed-in user' })
  @ApiOkResponseGeneric({ description: 'Claimed', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to claim' })
  async claimUserName(
    @Body() data: ClaimUserNameDto,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Claimed';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<{ userName: string }>(
        this.userService.claimUserName(req.userId, data.userName),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in claiming username [user: ${req.userId}, userName: ${data.userName}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to claim: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('getMe')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'The signed-in user' })
  @ApiOkResponseGeneric({ description: 'Fetched user', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to fetch user' })
  async getMe(@Req() req: AuthedRequest, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched user';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<MeResponse>(
        this.userService.getMe(req.userId),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in fetching me [user: ${req.userId}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch user: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Patch('updateProfile')
  @UseGuards(UserAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update display name, bio, avatar, preferred domain',
  })
  @ApiOkResponseGeneric({
    description: 'Updated profile',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to update profile' })
  async updateProfile(
    @Body() data: UpdateProfileDto,
    @Req() req: AuthedRequest,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Updated profile';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<MeResponse>(
        this.userService.updateProfile(req.userId, data),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in updating profile [user: ${req.userId}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to update profile: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('getProfile/:userName')
  @ApiOperation({ summary: 'Public pay-page profile' })
  @ApiOkResponseGeneric({
    description: 'Fetched profile',
    status: HttpStatus.OK,
  })
  @ApiBadRequestResponse({ description: 'Failed to fetch profile' })
  async getProfile(@Param('userName') userName: string, @Res() res: Response) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched profile';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<PublicProfile>(
        this.userService.getPublicProfile(userName),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in fetching profile [userName: ${userName}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch profile: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
