import Joi from 'joi';

// Expresión regular para UUIDv7
const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const payloadSchema = {
    CreateReservation: Joi.object({
        reservationId: Joi.string().required().pattern(uuidv7Regex).messages({
            'string.pattern.base': 'ID must be a valid UUIDv7'
        }),
        userId: Joi.string().required(),
        roomType: Joi.string().valid('Junior Suite', 'King Suite', 'Presidential Suite').required(),
        checkInDate: Joi.date().required(),
        checkOutDate: Joi.date().greater(Joi.ref('checkInDate')).required(),
        numberOfGuests: Joi.number().min(1).max(6).required(),
    }),
    CancelReservation: Joi.object({ reservationId: Joi.string().required() }),
    UpdateReservationDates: Joi.object({
        reservationId: Joi.string().required(),
        newCheckInDate: Joi.date().required(),
        newCheckOutDate: Joi.date().greater(Joi.ref('newCheckInDate')).required(),
    }),
    AdjustPriceForReservation: Joi.object({
        reservationId: Joi.string().required(),
        newPrice: Joi.number().greater(0).required(),
    }),
    CheckInReservation: Joi.object({ reservationId: Joi.string().required() }),
    CheckOutReservation: Joi.object({ reservationId: Joi.string().required() }),
    BlockRoomForMaintenance: Joi.object({
        roomId: Joi.string().required(),
        maintenanceReason: Joi.string().required(),
    }),
    ReleaseRoomFromMaintenance: Joi.object({ roomId: Joi.string().required() }),
};

export const commandSchema = Joi.object({
    type: Joi.string().valid(...Object.keys(payloadSchema)).required(),
    payload: Joi.object().required(),
});

export function validateCommand(command: any) {
    const schema = payloadSchema[command.type];
    const { error } = schema ? schema.validate(command.payload) : { error: 'Invalid Command Type' };
    return error ? { isValid: false, errors: error.details || error } : { isValid: true, errors: [] };
}
