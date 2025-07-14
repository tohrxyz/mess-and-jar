export type Room = {
    id: string;
    name: string;
    password: string;
}

type DefaultRoomResponse = {
    success: boolean;
    message: string;
}
export type RoomCreateOrEditResponse = DefaultRoomResponse

export type RoomGetResponse = DefaultRoomResponse & {
    room: Room
}
export enum RoomBackendMethod {
    RoomCreate = "create",
    RoomEdit = "edit",
    RoomGet = "get"
}

export type RoomParams = {
    id: string,
    name?: string,
    password?: string,
    method: RoomBackendMethod 
}