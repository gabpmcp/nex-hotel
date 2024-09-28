import { Injectable } from '@nestjs/common';
import { EventModel, CommandModel } from '../cqrs.js';
import { eventStorage } from '../handlers/event-store.js';

@Injectable()
export class StateService {

    // Obtener eventos de la base de datos
    // Si no se proporciona `minVersion`, usar un valor mínimo para no filtrar eventos antiguoss
    getEventsByReservationKey = async ({ payload: { reservationId } }: { payload: { reservationId: string } }, minVersion?: number) => await eventStorage.getEvents(reservationId, minVersion ?? 0);

    // Obtener estado actual del sistema basado en eventos previos
    projectState = (initialState: {}) => (events: EventModel[] = []) => events.reduce((state, event) => this.applyEventToState(state, event), initialState);

    projectDecisionState = (state: {}) => (event: EventModel) => this.applyEventToState(state, event);

    // Función pura que decide el próximo evento en base al comando y el estado actual
    decide(command: CommandModel, currentState: any): EventModel[] {
        switch (command.type) {
            case 'CreateReservation':
                if (this.isRoomTypeAvailable(currentState, command.payload)) {
                    return [{ type: 'ReservationCreated', payload: command.payload }];
                }
                throw new Error('Room not available for this type');

            case 'CancelReservation':
                return this.isCancelable(currentState, command.payload)
                    ? [{ type: 'ReservationCancelled', payload: command.payload }]
                    : [];

            case 'UpdateReservationDates':
                return this.isUpdateAllowed(currentState, command.payload)
                    ? [
                        { type: 'ReservationDatesUpdated', payload: command.payload },
                        { type: 'PriceRecalculated', payload: { ...command.payload, newPrice: 100 } }, // Lógica de precio
                    ]
                    : [];

            case 'AdjustPriceForReservation':
                return [
                    { type: 'PriceAdjusted', payload: { ...command.payload, reason: 'Manual adjustment' } },
                ];

            case 'CheckInReservation':
                return this.isCheckInAllowed(currentState, command.payload)
                    ? [{ type: 'ReservationCheckedIn', payload: command.payload }]
                    : [];

            case 'CheckOutReservation':
                return this.isCheckOutAllowed(currentState, command.payload)
                    ? [
                        { type: 'ReservationCheckedOut', payload: command.payload },
                        { type: 'RoomReleased', payload: { roomId: command.payload.roomId, reservationId: command.payload.reservationId } },
                    ]
                    : [];

            case 'BlockRoomForMaintenance':
                return [{ type: 'RoomBlocked', payload: command.payload }];

            case 'ReleaseRoomFromMaintenance':
                return [{ type: 'RoomReleased', payload: command.payload }];

            default:
                throw new Error('Invalid command type');
        }
    }

    // === FUNCIONES DE VALIDACIÓN Y NEGOCIO ===

    // Verificar si el tipo de habitación está disponible para crear la reserva
    // Verificar si hay habitaciones disponibles para el tipo de habitación y fechas dadas
    isRoomTypeAvailable({ rooms, reservations }: any = {}, { roomType, checkInDate, checkOutDate }: any) {
        // Filtrar habitaciones disponibles del tipo solicitado
        return (rooms || []).some(
            ({ type, roomId, isAvailable }) =>
                type === roomType &&
                isAvailable &&
                !(reservations || []).some(
                    (res: any) =>
                        res.roomId === roomId &&
                        res.status !== 'CANCELLED' && // Verifica que la reserva no esté cancelada
                        (
                            // Verificar si hay superposición de fechas
                            (new Date(res.checkInDate) <= new Date(checkOutDate) && new Date(res.checkOutDate) >= new Date(checkInDate)) // Verifica si hay superposición de fechas
                        )
                )
        );
    }

    // Verificar si una reserva puede ser cancelada
    isCancelable = ({ reservations }: any = {}, { reservationId }: any) =>
        (reservations || []).find(({ id, status, checkInDate }) => id === reservationId &&
            // Si la reserva existe y está en estado PENDING o CONFIRMED antes del check-in
            ['PENDING', 'CONFIRMED'].includes(status) &&
            // Si el check-in no haya iniciado
            new Date(checkInDate) > new Date());

    // Verificar si una reserva puede ser actualizada con nuevas fechas
    isUpdateAllowed({ reservations = [] }: any, { reservationId, newCheckInDate, newCheckOutDate }: any) {
        // Verificar si la reserva existe y está en estado PENDING o CONFIRMED antes del check-in
        const reservation = reservations.find((res: any) =>
            res.id === reservationId && ['PENDING', 'CONFIRMED'].includes(res.status)
        );

        // Verificar que la nueva fecha de check-in sea posterior a la fecha actual y que no haya conflictos de fechas con otras reservas para la misma habitación
        return reservation &&
            new Date(newCheckInDate) > new Date() &&
            !(reservations || []).some((res: any) =>
                res.roomId === reservation.roomId &&
                res.id !== reservationId &&
                res.status !== 'CANCELLED' &&
                new Date(res.checkInDate) <= new Date(newCheckOutDate) &&
                new Date(res.checkOutDate) >= new Date(newCheckInDate)
            );
    }

    // Verificar si se puede realizar el check-in
    isCheckInAllowed = (state: any, { reservationId }: any) => state.reservations?.find(({ id, status, checkInDate }) => id === reservationId && status === 'CONFIRMED' && new Date(checkInDate) <= new Date());

    // Verificar si se puede realizar el check-out
    isCheckOutAllowed = (state: any, { reservationId }: any) => state.reservations?.find(({ id, status }) => id === reservationId && status === 'CHECKED_IN');

    // Aplicar el evento al estado para calcular el estado actual
    applyEventToState(state: any, event: EventModel) {
        switch (event.type) {
            case 'ReservationCreated':
                return {
                    ...state,
                    reservations: [
                        ...(state.reservations || []),
                        { ...event.payload, status: 'PENDING' },
                    ],
                };
            case 'ReservationCancelled':
                return {
                    ...state,
                    reservations: state.reservations.map((res: any) =>
                        res.id === event.payload.reservationId ? { ...res, status: 'CANCELLED' } : res,
                    ),
                };
            case 'ReservationCheckedIn':
                return {
                    ...state,
                    reservations: state.reservations.map((res: any) =>
                        res.id === event.payload.reservationId ? { ...res, status: 'CHECKED_IN' } : res,
                    ),
                };
            case 'ReservationCheckedOut':
                return {
                    ...state,
                    reservations: state.reservations.map((res: any) =>
                        res.id === event.payload.reservationId ? { ...res, status: 'COMPLETED' } : res,
                    ),
                };
            case 'RoomReleased':
                return {
                    ...state,
                    rooms: state.rooms.map((room: any) =>
                        room.id === event.payload.roomId ? { ...room, isAvailable: true } : room,
                    ),
                };
            case 'RoomBlocked':
                return {
                    ...state,
                    rooms: state.rooms.map((room: any) =>
                        room.id === event.payload.roomId ? { ...room, isAvailable: false } : room,
                    ),
                };
            default:
                return state;
        }
    }
}
