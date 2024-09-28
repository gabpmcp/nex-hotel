import { Controller, Post, Body, BadRequestException, ConflictException } from '@nestjs/common';
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
        const result = this.stateService.decide(command, currentState)

        if (result.success) {
            await Promise.all(result.data.map(this.stateService.projectDecisionState(currentState)))
        } else {
            throw new ConflictException({ success: false, command, error: result.error })
        }


        return { success: true, events };
    }
}
