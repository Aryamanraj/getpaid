import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Response } from 'express';
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { BlogPost, BlogPostList } from '@recv/shared';
import { ApiOkResponseGeneric } from '../common/decorators/apiOkResponse.decorator';
import { makeResponse } from '../common/helpers/reponseMaker';
import { Promisify } from '../common/helpers/promisifier';
import { BlogService } from './blog.service';

@Controller('blog')
@ApiTags('Blog')
export class BlogController {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private blogService: BlogService,
  ) {}

  @Get('getPosts')
  @ApiOperation({ summary: 'Published articles for a domain, newest first' })
  @ApiQuery({ name: 'host', example: 'recv.to' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiOkResponseGeneric({ description: 'Fetched posts', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to fetch posts' })
  async getPosts(
    @Query('host') host: string,
    @Query('page') page: string,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched posts';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<BlogPostList>(
        this.blogService.getPosts(host ?? '', Number(page) || 1),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in fetching posts [host: ${host}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch posts: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('getFeed')
  @ApiOperation({ summary: 'All published summaries — sitemap and RSS' })
  @ApiQuery({ name: 'host', example: 'recv.to' })
  @ApiQuery({ name: 'limit', required: false, example: 100 })
  @ApiOkResponseGeneric({ description: 'Fetched feed', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to fetch feed' })
  async getFeed(
    @Query('host') host: string,
    @Query('limit') limit: string,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched feed';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<{ items: unknown[] }>(
        this.blogService.getFeed(host ?? '', Number(limit) || 100),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in fetching feed [host: ${host}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch feed: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }

  @Get('getPost/:slug')
  @ApiOperation({ summary: 'One published article by slug' })
  @ApiQuery({ name: 'host', example: 'recv.to' })
  @ApiOkResponseGeneric({ description: 'Fetched post', status: HttpStatus.OK })
  @ApiBadRequestResponse({ description: 'Failed to fetch post' })
  async getPost(
    @Param('slug') slug: string,
    @Query('host') host: string,
    @Res() res: Response,
  ) {
    let resStatus = HttpStatus.OK;
    let resMessage = 'Fetched post';
    let resData = null;
    let resSuccess = true;
    try {
      const result = await Promisify<BlogPost>(
        this.blogService.getPost(host ?? '', slug),
      );
      resData = result;
    } catch (error) {
      this.logger.error(
        `Error in fetching post [slug: ${slug}]: ${error.stack}`,
      );
      resStatus = error?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
      resMessage = `Failed to fetch post: ${error?.message}`;
      resSuccess = false;
    }
    makeResponse(res, resStatus, resSuccess, resMessage, resData);
  }
}
