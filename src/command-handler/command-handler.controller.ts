import { Controller, Post, Body, BadRequestException, ConflictException } from '@nestjs/common';
import { StateService } from '../state/state.service.js';
import { validateCommand } from './schema.js';

@Controller('commands')
export class CommandHandlerController {
    constructor(private readonly stateService: StateService) { }

    @Post()
    async handle(@Body() command: any) {
        const metadata = { createdAt: `${new Date(Date.now()).toLocaleTimeString('en-GB', { hour12: false })}.${new Date(Date.now()).getMilliseconds()}` }
        // console.log(new Date(Date.now()).toLocaleString(), 'Received command', command);
        const validation = validateCommand(command);
        // console.log(new Date(Date.now()).toLocaleString(), 'Validated command', validation);
        if (!validation.isValid) throw new BadRequestException(validation.errors);

        // console.log(new Date(Date.now()).toLocaleString(), 'Executing command');
        const events = await this.stateService.getEventsByReservationKey(command)
        // console.log(new Date(Date.now()).toLocaleString(), 'Fetched events', events);
        const currentState = this.stateService.projectState({})(events)
        // console.log(new Date(Date.now()).toLocaleString(), 'Fetched state', currentState);

        const result = this.stateService.decide(command, currentState)
        // console.log(new Date(Date.now()).toLocaleString(), 'Executed command', result);

        console.log(result)

        if (result.success) {
            await Promise.all(result.data.map(this.stateService.projectDecisionState(currentState)))
            console.log({ bussinessId: command.businessId, newEvents: result.data, metadata: { ...metadata, finishedAt: `${new Date(Date.now()).toLocaleTimeString('en-GB', { hour12: false })}.${new Date(Date.now()).getMilliseconds()}` } })
            await this.stateService.saveEvents({ businessId: command.businessId, newEvents: result.data, metadata: { ...metadata, finishedAt: `${new Date(Date.now()).toLocaleTimeString('en-GB', { hour12: false })}.${new Date(Date.now()).getMilliseconds()}` } })

        } else {
            throw new ConflictException({ success: false, command, error: result.error })
        }

        return { success: true, events };
    }
}
