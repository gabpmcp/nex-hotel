import { Injectable } from '@nestjs/common';
import { EventModel, CommandModel } from '../cqrs.js';
import { eventStorage } from '../handlers/event-store.js';

// Definición de modelos de retorno para éxito y error
type DecisionResult = {
    success: boolean;
    data: EventModel[] | [];
    error?: string;
};

@Injectable()
export class StateService {

    // Obtener eventos de la base de datos
    // Si no se proporciona `minVersion`, usar un valor mínimo para no filtrar eventos antiguoss
    getEventsByReservationKey = async ({ businessId, minVersion }: { businessId: string, minVersion?: number }) => await eventStorage.getEvents(businessId, minVersion ?? 0);

    saveEvents = async ({ businessId, newEvents, metadata }: { businessId: string, newEvents: EventModel[], metadata: any }) =>
        await eventStorage.save(
            await Promise.all(
                newEvents.map(async (event, index) => ({
                    aggregate_id: businessId,
                    event_type: event.type,
                    event_data: event.payload,
                    metadata,
                    version: (await eventStorage.findLastEvent(businessId)) || 0 + index + 1,
                    processed: false
                }))
            )
        );

    // Obtener estado actual del sistema basado en eventos previos
    projectState = (initialState: {}) => (events: EventModel[] = []) => events.reduce((state, event) => this.applyEventToState(state, event), initialState);

    projectDecisionState = (state: {}) => (event: EventModel) => this.applyEventToState(state, event);

    // Función pura que decide el próximo evento en base al comando y el estado actual
    decide = (command: CommandModel, currentState: any): DecisionResult =>
    ({
        'CreateReservation': () => {
            const { rooms, reservations } = currentState || {};
            const { roomType, checkInDate, checkOutDate } = command.payload;

            // Genera un evento de creación de habitación si no hay información previa de rooms
            const roomAllocated = (!rooms || !rooms.length)
                ?
                [
                    { type: 'RoomAllocated', payload: { roomType, status: 'Available', createdBy: 'system' } },
                    { type: 'ReservationCreated', payload: command.payload }
                ]
                : []

            // Verificar si el tipo de habitación está disponible para crear la reserva
            return roomAllocated || this.isRoomTypeAvailable(currentState, command.payload)
                ? { success: true, data: roomAllocated || { type: 'ReservationCreated', payload: command.payload } }
                : {
                    // Enriquecer el error con el estado actual
                    success: false, data: [], error: {
                        currentState: { rooms, reservations },
                        inputs: { roomType, checkInDate, checkOutDate },
                        message: 'Room not available for this type'
                    }
                }
        },

        'CancelReservation': () =>
            this.isCancelable(currentState, command.payload)
                ? { success: true, data: [{ type: 'ReservationCancelled', payload: command.payload }] }
                : { success: false, data: [], error: 'Reservation cannot be cancelled' },

        'UpdateReservationDates': () =>
            this.isUpdateAllowed(currentState, command.payload)
                ? {
                    success: true,
                    data: [
                        { type: 'ReservationDatesUpdated', payload: command.payload },
                        { type: 'PriceRecalculated', payload: { ...command.payload, newPrice: 100 } }
                    ]
                }
                : { success: false, data: [], error: 'Update not allowed for the reservation dates' },

        'AdjustPriceForReservation': () => ({
            success: true,
            data: [{ type: 'PriceAdjusted', payload: { ...command.payload, reason: 'Manual adjustment' } }]
        }),

        'CheckInReservation': () =>
            this.isCheckInAllowed(currentState, command.payload)
                ? { success: true, data: [{ type: 'ReservationCheckedIn', payload: command.payload }] }
                : { success: false, data: [], error: 'Check-in not allowed for this reservation' },

        'CheckOutReservation': () =>
            this.isCheckOutAllowed(currentState, command.payload)
                ? {
                    success: true,
                    data: [
                        { type: 'ReservationCheckedOut', payload: command.payload },
                        { type: 'RoomReleased', payload: { roomId: command.payload.roomId, reservationId: command.payload.reservationId } }
                    ]
                }
                : { success: false, data: [], error: 'Check-out not allowed for this reservation' },

        'BlockRoomForMaintenance': () => ({
            success: true,
            data: [{ type: 'RoomBlocked', payload: command.payload }]
        }),

        'ReleaseRoomFromMaintenance': () => ({
            success: true,
            data: [{ type: 'RoomReleased', payload: command.payload }]
        })
    }[command.type]?.() ?? { success: false, data: [], error: 'Invalid command type' });

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
    applyEventToState = (state: any, { type, payload }: EventModel) => ({
        'ReservationCreated': () => ({
            ...state,
            reservations: [
                ...(state.reservations || []),
                {
                    id: payload.reservationId,
                    roomType: payload.roomType,
                    status: 'PENDING',
                    checkInDate: payload.checkInDate,
                    checkOutDate: payload.checkOutDate
                }
            ],
        }),
        'ReservationCancelled': () => ({
            ...state,
            reservations: state.reservations.map((res: { id: any; }) => res.id === payload.reservationId
                ? { ...res, status: 'CANCELLED' }
                : res),
        }),
        'ReservationCheckedIn': () => ({
            ...state,
            reservations: state.reservations.map((res: { id: any; }) => res.id === payload.reservationId
                ? { ...res, status: 'CHECKED_IN', checkInDate: payload.checkInDate }
                : res),
        }),
        'ReservationCheckedOut': () => ({
            ...state,
            reservations: state.reservations.map((res: { id: any; }) => res.id === payload.reservationId
                ? { ...res, status: 'COMPLETED' }
                : res),
            rooms: state.rooms.map((room: { id: any; }) => room.id === payload.roomId
                ? { ...room, isAvailable: true }
                : room),
        }),
        'RoomReleased': () => ({
            ...state,
            rooms: state.rooms.map((room: { id: any; }) => room.id === payload.roomId
                ? { ...room, isAvailable: true }
                : room),
        }),
        'RoomBlocked': () => ({
            ...state,
            rooms: state.rooms.map((room: { id: any; }) => room.id === payload.roomId
                ? { ...room, isAvailable: false }
                : room),
        }),
        'PriceCalculated': () => ({
            ...state,
            reservations: state.reservations.map((res: { id: any; }) => res.id === payload.reservationId
                ? { ...res, price: payload.newPrice }
                : res),
        }),
        'PriceAdjusted': () => ({
            ...state,
            reservations: state.reservations.map((res: { id: any; }) => res.id === payload.reservationId
                ? { ...res, price: payload.adjustedPrice }
                : res),
        }),
    }[type === 'PriceCalculated' || type === 'PriceRecalculated' ? 'PriceCalculated' : type]?.() || state);
}
