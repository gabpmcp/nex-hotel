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

        const events = await this.stateService.getEventsByReservationKey(command)
        const currentState = this.stateService.projectState({})(events)
        const newEvents = this.stateService.decide(command, currentState)
        await Promise.all(newEvents.map(this.stateService.projectDecisionState(currentState)))

        return { success: true, events };
    }
}
