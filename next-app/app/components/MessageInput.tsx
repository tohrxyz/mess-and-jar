"use client";
import { useState } from "react";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { mutateSendMessage } from "../mutations/message";
import { encryptStringClient } from "../lib/crypto-client";
import { scrollToBottom } from "../lib/scroll-util";

export default function MessageInput() {
    const [error, setError] = useState<null | Error>(null);
    const { inputMessage, setInputMessage, room, user, setMessages, lastTimestampRef, messageAreaScrollRef } = useRoomContext();

    const handleSendMessage = async (msg: string): Promise<null | Error> => {
        const userObj = JSON.parse(user ?? "{}") as { username: string };
        const date = Date.now().toString();
        const encryptedMessage = encryptStringClient(msg, room?.password ?? "");
        const response = await mutateSendMessage(room?.id ?? "general", userObj.username, encryptedMessage, date);
        if (response.success) {
            setInputMessage("");
            setMessages(prev => [...prev, {
                date,
                room: room?.id ?? "general",
                username: userObj.username,
                msg: msg,
                isSentFromClient: true,
            }]);
            lastTimestampRef.current = Number(date);
            scrollToBottom(messageAreaScrollRef);
            return null;
        } else {
            return new Error("Failed to send message");
        }
    }


    const handleOnKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputMessage.trim().length > 0) {
            const result = await handleSendMessage(inputMessage);
            if (result instanceof Error) {
                setError(result);
                setTimeout(() => {
                    setError(null);
                }, 5000);
                return;
            }
            setError(null);
        }
    }

    return (
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex-shrink-0">
            <div className="flex space-x-4">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleOnKeyDown}
                    suppressHydrationWarning
                />
                <button 
                    className={`bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg font-medium transition-colors duration-200 ${error ? "opacity-50 cursor-not-allowed bg-red-500 hover:bg-red-600 duration-100" : ""}`} 
                    onClick={() => handleSendMessage(inputMessage)}
                    disabled={inputMessage.length === 0 || error !== null}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
                    </svg>
                </button>
            </div>
        </div>
    );
} 