import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import basicAuth from 'express-basic-auth';

const PORT = process.env.PORT || 3000

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ // Validation configuration
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const swaggerConfig = new DocumentBuilder() // swagger configuration
    .setTitle('SecurityOn API')
    .setDescription('SecurityOn API documentation')
    .setVersion('0.1')
    .addTag('securityon')
    .build();
  
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use('/api-docs', basicAuth({
    users: { [process.env.SWAGGER_USER as string]: process.env.SWAGGER_PASSWORD as string },
    challenge: true,
  }));

  SwaggerModule.setup('api-docs', app, document); // Swagger setup

  app.enableCors({ // CORS configuration
    origin: process.env.CORS_ORIGIN,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
    credentials: true,
  });

  app.use(helmet()); // helmet protection

  await app.listen(PORT); // Start the server
  
  console.log(`API running on port ${PORT}`)
}
bootstrap();
