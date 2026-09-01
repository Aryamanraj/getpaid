import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Sourced from @nestjs/typeorm rather than typeorm directly: this value is
 * consumed by Nest, and yarn workspaces can hoist two physical copies of
 * typeorm whose structurally identical types are nominally distinct.
 */
export interface DBConfig {
  entities: TypeOrmModuleOptions['entities'];
}
