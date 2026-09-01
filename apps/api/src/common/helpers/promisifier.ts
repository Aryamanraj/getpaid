import { ResultWithError } from '../interfaces';

export async function Promisify<T>(req: Promise<ResultWithError>): Promise<T> {
  const { data: result, error } = await req;
  if (error) throw error;
  return result;
}
