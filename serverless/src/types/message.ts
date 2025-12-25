export type Message = {
	timestamp: number;
	room_id: string;
	username: string;
	msg: string;
	identity_pubkey: string | null;
	signature: string | null;
};
