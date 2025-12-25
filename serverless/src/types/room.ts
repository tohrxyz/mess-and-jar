export type Room = {
	id: string;
	name: string;
	password: string;
};

export const ValidRoomOps = ['create', 'edit', 'get'] as const;
export type ValidRoomOps = (typeof ValidRoomOps)[number];
