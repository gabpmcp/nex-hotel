import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { getAppPort } from '../config.js'; // Importa la función desde config.ts

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(getAppPort());
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
