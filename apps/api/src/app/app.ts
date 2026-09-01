import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import * as bodyParser from 'body-parser';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { dotEnvOptions } from '../../config/dotenv-options';
import { AppModule } from './app.module';
import { assertMigrationsUpToDate } from '../db/migration-check';
import { DomainRepoService } from '../repo/core/domain-repo.service';

async function bootstrap() {
  dotenv.config(dotEnvOptions);
  await assertMigrationsUpToDate();

  const PORT = process.env.PORT || 3001;

  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  configureSwagger(app);

  app.setGlobalPrefix('api/v1');

  app.use(bodyParser.json({ limit: '2mb' }));
  app.use(bodyParser.urlencoded({ limit: '2mb', extended: true }));
  // Any active domain, its subdomains, and localhost may call the API. The
  // list is read from core.Domains so a new domain needs no redeploy here.
  const domainRepo = app.get(DomainRepoService);
  app.enableCors({
    credentials: false,
    origin: async (origin, callback) => {
      if (!origin) return callback(null, true);
      try {
        const host = new URL(origin).hostname.toLowerCase();
        if (host === 'localhost' || host.endsWith('.localhost'))
          return callback(null, true);
        const { data } = await domainRepo.getAll(
          { where: { IsActive: true }, select: { Host: true } },
          false,
        );
        const ok = (data ?? []).some(
          (d) => host === d.Host || host.endsWith(`.${d.Host}`),
        );
        callback(null, ok);
      } catch {
        callback(null, false);
      }
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      skipMissingProperties: true,
    }),
  );

  await app.listen(PORT);
  console.log(`API listening on :${PORT}`);
}

function configureSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('recv.to / payee.id API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'Api-auth')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const docsDir = path.join(process.cwd(), '..', '..', 'docs');
  if (fs.existsSync(docsDir)) {
    fs.writeFileSync(
      path.join(docsDir, 'swagger.yaml'),
      yaml.dump(document, { indent: 2 }),
    );
  }
}

bootstrap();
