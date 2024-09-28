import { Module } from '@nestjs/common';
import { CommandHandlerController } from './command-handler/command-handler.controller.js';
import { StateService } from './state/state.service.js';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que el módulo de configuración sea global
      envFilePath: ['.env'], // Ruta del archivo .env
    }),
  ],
  controllers: [CommandHandlerController],
  providers: [StateService],
})
export class AppModule { }
