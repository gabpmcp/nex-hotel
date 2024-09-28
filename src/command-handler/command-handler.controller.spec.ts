import { Test, TestingModule } from '@nestjs/testing';
import { CommandHandlerController } from './command-handler.controller.js';

describe('CommandHandlerController', () => {
  let controller: CommandHandlerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommandHandlerController],
    }).compile();

    controller = module.get<CommandHandlerController>(CommandHandlerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
