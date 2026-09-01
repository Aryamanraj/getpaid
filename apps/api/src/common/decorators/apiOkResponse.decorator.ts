import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ResponseType } from '../helpers/reponseMaker';

interface ApiOkResponseGenericOptions<T> {
  description: string;
  status: number;
  type?: Type<T>;
  isArray?: boolean;
}

export const ApiOkResponseGeneric = <T extends Type<unknown>>(
  options: ApiOkResponseGenericOptions<T>,
) => {
  const { description, status, type, isArray } = options;

  const dataSchema = type
    ? isArray
      ? { type: 'array', items: { $ref: getSchemaPath(type) } }
      : { $ref: getSchemaPath(type) }
    : { type: 'object', nullable: true };

  return applyDecorators(
    ApiExtraModels(ResponseType, ...(type ? [type] : [])),
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ResponseType) },
          { properties: { data: dataSchema } },
        ],
      },
    }),
  );
};
