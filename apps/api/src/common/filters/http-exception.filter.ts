import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, any>;
        message = resp.message || exception.message;
        code = resp.code || resp.error || 'ERROR';
        errors = resp.errors;
      } else {
        message = exceptionResponse as string;
      }
    }

    if (process.env.NODE_ENV === 'development' && exception instanceof Error) {
      console.error(exception);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(errors && { errors }),
        ...(process.env.NODE_ENV === 'development' &&
          exception instanceof Error && {
            stack: exception.stack,
          }),
      },
    });
  }
}
