import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DBConfig } from './db.config';

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS module with static factory methods
export class DBModule {
  public static getConnectionOptions(
    dbConfig: DBConfig,
    configService: ConfigService,
  ): TypeOrmModuleOptions {
    let connectionOptions: TypeOrmModuleOptions =
      DBModule.getConnectionOptionsPostgres(configService);

    connectionOptions = {
      ...connectionOptions,
      synchronize: false, // M1 — schema is managed exclusively by src/db/migrate.ts
      migrationsRun: false,
      entities: dbConfig.entities,
    };
    return connectionOptions;
  }

  private static getConnectionOptionsPostgres(
    configService: ConfigService,
  ): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: configService.get('POSTGRES_HOST'),
      port: configService.get('POSTGRES_PORT'),
      username: configService.get('POSTGRES_USER'),
      password: configService.get('POSTGRES_PASSWORD'),
      database: configService.get('POSTGRES_DB'),
      ssl:
        configService.get('POSTGRES_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  public static forRoot(dbConfig: DBConfig): DynamicModule {
    return {
      module: DBModule,
      imports: [
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) =>
            DBModule.getConnectionOptions(dbConfig, configService),
        }),
      ],
      controllers: [],
      providers: [],
      exports: [],
    };
  }
}
