import type { ApiResponse } from '@base/shared';
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the controller already returned our format, pass through
        if (
          data &&
          typeof data === 'object' &&
          'code' in (data as any) &&
          'data' in (data as any)
        ) {
          return data as unknown as ApiResponse<T>;
        }
        return { code: 1, data, msg: 'ok' };
      })
    );
  }
}
