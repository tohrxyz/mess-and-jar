import { useEffect, useRef } from "react";
import { Message } from "../types";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { scrollToBottom } from "../lib/scroll-util";

interface MessageAreaProps {
    messages: Message[];
    currentUsername: string;
}

interface MessageItemProps {
    message: Message;
    isCurrentUser: boolean;
}

function MessageItem({ message, isCurrentUser }: MessageItemProps) {
    const renderMessageWithLinks = (text: string) => {
        // URL regex pattern to detect URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        
        return parts.map((part, index) => {
            if (urlRegex.test(part)) {
                return (
                    <a
                        key={index}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-[20px] ${isCurrentUser ? 'rounded-br-none' : 'rounded-bl-none'} ${
                    isCurrentUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-100'
                }`}
            >
                {!isCurrentUser && (
                    <div className="text-xs font-medium mb-1 opacity-75">
                        {message.username}
                    </div>
                )}
                <div className={`${message.msg !== "" ? "" : "text-gray-400"} break-all`}>
                    {message.msg !== "" ? renderMessageWithLinks(message.msg) : "Unable to decrypt message"}
                </div>
            </div>
        </div>
    );
}

export default function MessageArea({ messages, currentUsername }: MessageAreaProps) {
    const { messageAreaScrollRef } = useRoomContext();
    const isScrolledManuallyRef = useRef(false);
    const isTouchedBottomRef = useRef(false);

    useEffect(() => {
        if (!isScrolledManuallyRef.current || isTouchedBottomRef.current) {
            scrollToBottom(messageAreaScrollRef);
            isScrolledManuallyRef.current = false;
        }
    }, [messages]);

    return (
        <div 
            className="flex-1 overflow-y-scroll p-6 space-y-4 min-h-0 max-h-[calc(100vh-7.5rem)]" 
            ref={messageAreaScrollRef}
            onScroll={(e) => {
                if (!isScrolledManuallyRef.current) {
                    isScrolledManuallyRef.current = true;
                }
                if (
                    (messageAreaScrollRef.current?.scrollTop ?? 0) + 
                    (messageAreaScrollRef.current?.clientHeight ?? 0) >= 
                    (messageAreaScrollRef.current?.scrollHeight ?? 0) - 20
                ) {
                    isTouchedBottomRef.current = true;
                    isScrolledManuallyRef.current = false;
                } else if (isTouchedBottomRef.current) {
                    isTouchedBottomRef.current = false;
                }
            }}
        >
            {messages.map((message, index) => {
                const isCurrentUser = message.username === currentUsername;
                return (
                    <MessageItem
                        key={index}
                        message={message}
                        isCurrentUser={isCurrentUser}
                    />
                );
            })}
        </div>
    );
} 