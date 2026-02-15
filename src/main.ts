import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const PORT = process.env.PORT || 3000

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SecurityOn API')
    .setDescription('SecurityOn API documentation')
    .setVersion('0.1')
    .addTag('securityon')
    .build();
  
  await app.listen(PORT);
  console.log(`API running on port ${PORT}`)
}
bootstrap();
