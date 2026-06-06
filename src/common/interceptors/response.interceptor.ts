import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse<T> {
  code: 1;
  data: T;
  msg: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the controller already returned our format, pass through
        if (
          data &&
          typeof data === 'object' &&
          'code' in (data as any) &&
          'data' in (data as any)
        ) {
          return data as unknown as SuccessResponse<T>;
        }
        return { code: 1, data, msg: 'ok' };
      })
    );
  }
}
