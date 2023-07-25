import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { FileLogger } from '../logger/FileLogger.logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private logger;
  constructor() {
    this.logger = new FileLogger();
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    console.log(
      '**********************************************************************',
    );
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const ip = request.ip;
    const url = request.originalUrl;
    console.log('method', method);
    console.log('url', url);
    console.log('ip', ip);

    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        console.log(`After... ${Date.now() - now}ms | Date:${new Date()}`);
        console.log(
          '**********************************************************************',
        );
      }),
      catchError((response) => {
        console.log(response);
        console.log('Logging into file');

        let message = '';

        message +=
          '**********************************************************************\n';
        message += `Date ${new Date()}\n`;
        message += `method ${method}\n`;
        message += `url ${url}\n`;
        message += `ip ${ip}\n`;
        message += response;
        message += '\n';
        message +=
          '**********************************************************************\n';

        console.log();
        this.logger.log(message);
        return throwError(response);
      }),
    );
  }
}
