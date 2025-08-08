import Dexie, { Table } from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

export interface ChatMessage {
    id: string;
    date: string;
    room: string;
    username: string;
    msg: string;
    signature?: string;
    identity_pubkey?: string;
}

export const CHAT_DB_KEY = "chat-db"

class ChatDB extends Dexie {
    messages!: Table<ChatMessage, string>;

    constructor() {
        super(CHAT_DB_KEY)
        this.version(1).stores({
            messages: "++id, date, room"
        })
        this.version(2).stores({
            messages: "++id, date, room, identity_pubkey, signature"
        })
        this.version(3).stores({
            messages: "++id, date, room, signature"
        })
        this.version(4).stores({
            messages: "++id, date, room, identity_pubkey, signature"
        })
        this.version(5).stores({
            messages: "++id, date, room, identity_pubkey, signature, username"
        })
        this.version(6).stores({
            messages: "++id, date, room, identity_pubkey, signature, username, [username+identity_pubkey]"
        })
    }
}

export const chatDb = new ChatDB()

export function useMessagesLocal(roomId: string) {
    return useLiveQuery(() => chatDb.messages.where('room').equals(roomId).toArray(), [roomId])
}

export async function getMessages(roomId: string) {
    return await chatDb.messages.where('room').equals(roomId).toArray()
}

export async function saveMessage(message: ChatMessage) {
    await chatDb.messages.put(message)
}

export async function deleteMessage(id: string) {
    await chatDb.messages.delete(id)
}

export async function deleteMessagesByRoom(roomId: string) {
    await chatDb.messages.where('room').equals(roomId).delete()
}

export async function deleteAllMessages() {
    await chatDb.messages.clear()
}

export async function getLastTimestamp(roomId: string) {
    const messages = await chatDb.messages.where('room').equals(roomId).toArray()
    return messages.length > 0 ? Number(messages.at(-1)?.date) : 0
}

export async function getIdentitiesByUsername(username: string) {
    return await chatDb.messages
        .where('[username+identity_pubkey]')
        .between([username, Dexie.minKey], [username, Dexie.maxKey])
        .toArray()
        .then(messages => [...new Set(messages.filter(v => v.identity_pubkey).map(m => m.identity_pubkey))]);
}

export async function saveMessages(messages: ChatMessage[]) {
    await chatDb.messages.bulkPut(messages)
}

export async function deleteOldMessages(roomId: string, maxCount: number) {
    const messages = await chatDb.messages.where('room').equals(roomId).toArray()
    if (messages.length > maxCount) {
        const sortedMessages = messages.sort((a, b) => Number(a.date) - Number(b.date))
        const messagesToDelete = sortedMessages.slice(0, messages.length - maxCount)
        await chatDb.messages.bulkDelete(messagesToDelete.map(m => m.id ?? ""))
    }
}

export const MAX_MESSAGES_PER_ROOM = 500
