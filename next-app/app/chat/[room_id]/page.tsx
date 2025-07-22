"use client";

import { useParams, useRouter } from "next/navigation";
import { useRoomContext } from "./RoomContext";
import { LOCAL_STORAGE_KEYS } from "@/app/constants/localStorageKeys";
import { getFromStorage } from "@/app/lib/localStorage";
import { useEffect } from "react";
import { Message, Room } from "@/app/types";
import MessageArea from "@/app/components/MessageArea";
import MessageInput from "@/app/components/MessageInput";
import { useMessages } from "@/app/queries/messages";
import ChatHeader from "@/app/components/ChatHeader";
import { getLastTimestamp, saveMessages, useMessagesLocal } from "@/app/indexdb/chat-db";

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
    //TODO: consider memoizing
    const messages: Message[] = messagesLocal?.map(m => ({
        date: m.date,
        username: m.username,
        msg: m.msg,
        room: m.room,
        isSentFromClient: false,
    })) ?? [];

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