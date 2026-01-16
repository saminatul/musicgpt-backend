import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { NotificationsGateway } from './presentation/gateways/notifications.gateway';
import { SocketIOWebSocketService } from './infrastructure/websocket/socket-io-websocket.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );


  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('MusicGPT API')
    .setDescription('MusicGPT Backend API - Scalable production-ready backend system. All endpoints except /auth/register and /auth/login require Bearer token authentication.')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token obtained from /auth/login or /auth/register. You can enter just the token (Swagger will add "Bearer " prefix automatically)',
        in: 'header',
      },
      'bearer-token',
    )
    .addTag('Authentication', 'User authentication endpoints')
    .addTag('Users', 'User management endpoints')
    .addTag('Prompts', 'Prompt management endpoints')
    .addTag('Audio', 'Audio management endpoints')
    .addTag('Subscription', 'Subscription management endpoints')
    .addTag('Search', 'Unified search endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // WebSocket will be initialized automatically by NestJS
  // The gateway's afterInit hook will set the server instance

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/docs`);
}

bootstrap();
