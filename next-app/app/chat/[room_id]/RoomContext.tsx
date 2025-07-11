"use client";
import { createContext, RefObject, SetStateAction, useContext, useRef, useState } from "react";
import { Message, Room } from "../../types";

export const RoomContext = createContext<{
    user: string | null;
    setUser: (user: SetStateAction<string | null>) => void;
    inputMessage: string;
    setInputMessage: (message: SetStateAction<string>) => void;
    messages: Message[];
    setMessages: (messages: SetStateAction<Message[]>) => void;
    room: Room | null;
    setRoom: (room: SetStateAction<Room | null>) => void;
    previousRoomIdRef: RefObject<string | null>;
    lastTimestampRef: RefObject<number>;
    messageAreaScrollRef: RefObject<HTMLDivElement | null>;
}>({
    user: null,
    setUser: () => {},
    inputMessage: "",
    setInputMessage: () => {},
    messages: [],
    setMessages: () => {},
    room: null,
    setRoom: () => {},
    previousRoomIdRef: { current: null },
    lastTimestampRef: { current: 0 },
    messageAreaScrollRef: { current: null },
}); 

export const useRoomContext = () => {
    const context = useContext(RoomContext);
    if (!context) {
        throw new Error("useRoomContext must be used within a RoomProvider");
    }
    return context;
}

export const RoomProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<string | null>(null);
    const [inputMessage, setInputMessage] = useState<string>("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [room, setRoom] = useState<Room | null>(null);
    const previousRoomIdRef = useRef<string | null>(null);
    const lastTimestampRef = useRef<number>(0);
    const messageAreaScrollRef = useRef<HTMLDivElement>(null);

    return (
        <RoomContext.Provider value={{ user, setUser, inputMessage, setInputMessage, messages, setMessages, room, setRoom, previousRoomIdRef, lastTimestampRef, messageAreaScrollRef }}>
            {children}
        </RoomContext.Provider>
    )
}