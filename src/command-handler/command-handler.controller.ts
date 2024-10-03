import { Controller, Post, Body, BadRequestException, ConflictException } from '@nestjs/common';
import { StateService } from '../state/state.service.js';
import { validateCommand } from './schema.js';
import executeCamundaEngine from '../handlers/camunda.js';

@Controller('commands')
export class CommandHandlerController {
    constructor(private readonly stateService: StateService) { }

    @Post()
    async handle(@Body() command: any) {
        const metadata = { createdAt: `${new Date(Date.now()).toLocaleTimeString('en-GB', { hour12: false })}.${new Date(Date.now()).getMilliseconds()}` }
        const validation = validateCommand(command)
        if (!validation.isValid) throw new BadRequestException(validation.errors)

        const events = await this.stateService.getEventsByReservationKey(command)
        // console.log(events.length)
        const currentState = this.stateService.projectState({})(events)
        const result = this.stateService.decide(command, currentState)

        if (result.success) {
            await Promise.all(result.data.map(this.stateService.projectDecisionState(currentState)))
            await this.stateService.saveEvents({ businessId: command.businessId, newEvents: result.data, metadata: { ...metadata, finishedAt: `${new Date(Date.now()).toLocaleTimeString('en-GB', { hour12: false })}.${new Date(Date.now()).getMilliseconds()}` } })
            // this.notifyReservationPrice()
            // Si se generó el evento ReservationCreated, se activa el dispatcher de notificación
            const reservationCreatedEvent = result.data.find(event => event.type === 'ReservationCreated')
            if (reservationCreatedEvent) {
                const { roomType, checkInDate, checkOutDate, reservationId } = reservationCreatedEvent.payload || {};
                if (roomType && checkInDate && checkOutDate && reservationId) {
                    // TODO: Notificar el precio de la reserva
                    await this.notifyReservationPrice({
                        payload: { roomType, checkInDate, checkOutDate, reservationId },
                        businessId: command.businessId
                    });
                }
            }
        } else {
            throw new ConflictException({ success: false, command, error: result.error })
        }

        return { success: true, events };
    }

    // notifyReservationPrice = () => {
    //     executeCamundaEngine({ roomType: 'Junior Suite', days: 21, isWeekend: false, availability: 17 })
    // }
    notifyReservationPrice = async ({ payload: { roomType, checkInDate, checkOutDate, reservationId }, businessId }) =>
        this.handle({
            businessId,
            type: 'NotifyPrice',
            payload: {
                reservationId,
                calculatedPrice: await executeCamundaEngine({ roomType, checkInDate, checkOutDate })
            }
        }).catch(error => console.error('Error notificando el precio', error))
}
