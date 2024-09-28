export type CommandModel = {
    type: string;
    payload: { [key: string]: any };
};

export type EventModel = {
    type: string;
    payload: { [key: string]: any };
};
