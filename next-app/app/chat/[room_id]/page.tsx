"use client";

import { useParams, useRouter } from "next/navigation";
import { useRoomContext } from "./RoomContext";
import { LOCAL_STORAGE_KEYS } from "@/app/constants/localStorageKeys";
import { clearStorage, getFromStorage, saveToStorage } from "@/app/lib/localStorage";
import { useEffect, useState } from "react";
import { Message, Room } from "@/app/types";
import MessageArea from "@/app/components/MessageArea";
import MessageInput from "@/app/components/MessageInput";
import { useMessages } from "@/app/queries/messages";
import ChatHeader from "@/app/components/ChatHeader";
import { getLastTimestamp, saveMessages, useMessagesLocal } from "@/app/indexdb/chat-db";
import { cryptoKeyFromRawExport, decryptSubtleClient, hexToArrayBuffer, prepareBufferFromMessage, verifyMessageAgainstPubkeyHex } from "@/app/lib/crypto-client";

export default function RoomPage() {
    const router = useRouter();
    const { room_id } = useParams();
    const { 
        user, 
        room, 

        previousRoomIdRef, 
        lastTimestampRef,

        setUser, 
        setRoom, 
    } = useRoomContext();

    const messagesLocal = useMessagesLocal(room_id as string);
    const [messages, setMessages] = useState<Message[]>([])

    useEffect(() => {
        const doFn = async () => {
            if (!messagesLocal || !room?.password) return;
            
            const key = await cryptoKeyFromRawExport(room.password);
            const textDecoder = new TextDecoder()
            const decryptedMessages: Message[] = [];
            const batchSize = 20;
            
            for (let i = 0; i < messagesLocal.length; i += batchSize) {
                const batch = messagesLocal.slice(i, i + batchSize);
                const batchResults = await Promise.all(batch.map(async (v) => {
                    try {
                        const [ivHex, encMsg] = v.msg.split("_")
                        const iv = new Uint8Array(hexToArrayBuffer(ivHex))
                        const decryptedMessageContent = await decryptSubtleClient(encMsg, { key, iv })
                        const decoded = textDecoder.decode(decryptedMessageContent)
                        const preparedMessageBuffToSign = await prepareBufferFromMessage({
                            date: v.date.toString(),
                            room: v.room,
                            username: v.username,
                            msg: decoded
                        })
                        const isValidSig = await verifyMessageAgainstPubkeyHex({ 
                            messageBuffer: preparedMessageBuffToSign,
                            publicKeyHex: v.identity_pubkey ?? "",
                            signature: v.signature ?? ""
                        })
                        return {
                            ...v,
                            msg: decoded,
                            isSentFromClient: false,
                            isSignatureValid: isValidSig
                        } as Message;
                    } catch (error) {
                        console.error(error)
                        return {
                            ...v,
                            msg: "Unable to decrypt message",
                            isSentFromClient: false,
                        } as Message;
                    }
                }));
                decryptedMessages.push(...batchResults);
            }
            setMessages(decryptedMessages);
        }
        doFn();
    }, [messagesLocal, room?.password])


    useEffect(() => {
        if (messagesLocal) {
            lastTimestampRef.current = Number(messagesLocal.at(messagesLocal.length - 1)?.date) ?? 0;
        }
    }, [messagesLocal]);

    const { data: queriedMessages, isLoading, failureCount } = useMessages(room_id as string, lastTimestampRef.current);

    
    useEffect(() => {
        const userData = getFromStorage(LOCAL_STORAGE_KEYS.USER);
        if (!userData) {
            router.push("/auth");
        } else {
            setUser(userData);
        }
    }, [router]);

    useEffect(() => {
        const wasNukedDueToMigration: string | null = getFromStorage(LOCAL_STORAGE_KEYS.WAS_DB_MIGRATED_JSON_SQLITE_V1)
        if (wasNukedDueToMigration === null) {
            const currentStoredRooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS)
            saveToStorage(LOCAL_STORAGE_KEYS.BACKUP_WAS_DB_MIGRATED_JSON_SQLITE_V1, currentStoredRooms)
            clearStorage(LOCAL_STORAGE_KEYS.ROOMS)
            saveToStorage(LOCAL_STORAGE_KEYS.WAS_DB_MIGRATED_JSON_SQLITE_V1, "true")
            window.location.replace('/')
        }
    }, [])
    
    useEffect(() => {
        const doFn = async () => {
            if (room_id) {
                const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS);
                if (rooms) {
                    const parsedRooms = JSON.parse(rooms);
                    const room = parsedRooms.find((room: Room) => room.id === room_id);
                    setRoom(room);
                }
                const timestamp = await getLastTimestamp(room_id as string);
                lastTimestampRef.current = timestamp;
    
                if (!previousRoomIdRef.current) {
                    previousRoomIdRef.current = room_id as string;
                } else {
                    if (previousRoomIdRef.current !== room_id as string)     {
                        lastTimestampRef.current = null;
                        previousRoomIdRef.current = room_id as string;
                    }
                }
            }
        }
        doFn();
    }, [room_id]);
    
    useEffect(() => {
        if (room_id) {
            if (queriedMessages && queriedMessages.length > 0) {
                saveMessages(queriedMessages.map(m => ({
                    id: `${m.date}-${m.username}-${m.room}`,
                    date: m.date,
                    room: m.room,
                    username: m.username,
                    msg: m.msg,
                    identity_pubkey: (m as any)['identity_pubkey'],
                    signature: m.signature
                })));
                lastTimestampRef.current = Number(queriedMessages?.at(queriedMessages.length - 1)?.date);
            }
        }
    }, [queriedMessages, room_id])
    
    return (
        <div className="h-full grid grid-rows-[auto_1fr_auto] bg-gray-900">
            <ChatHeader room={room} messageCount={messages.length} failureCount={failureCount} />

            <main className="min-h-0 overflow-hidden">
                <MessageArea
                    messages={messages}
                    currentUsername={JSON.parse(user ?? "{}").username}
                />
            </main>

            <footer>
                <MessageInput />
            </footer>
        </div>
    )
}