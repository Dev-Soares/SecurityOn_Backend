import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";

import { logger } from "../logger/pino";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {

  catch(exception: unknown, host: ArgumentsHost) {

    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : 500;

    logger.error({
      method: request.method,
      url: request.url,
      status,
      exception,
    });

    response.status(status).json({
      statusCode: status,
      message: "Internal server error",
    });
  }
}