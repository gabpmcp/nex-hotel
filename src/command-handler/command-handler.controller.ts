import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { StateService } from '../state/state.service.js';
import { validateCommand } from './schema.js';

@Controller('commands')
export class CommandHandlerController {
    constructor(private readonly stateService: StateService) { }

    @Post()
    async handle(@Body() command: any) {
        const validation = validateCommand(command);
        if (!validation.isValid) throw new BadRequestException(validation.errors);

        const currentState = await this.stateService.getCurrentState();
        const events = this.stateService.decide(command, currentState);
        await Promise.all(events.map(this.stateService.applyEvent));

        return { success: true, events };
    }
}
