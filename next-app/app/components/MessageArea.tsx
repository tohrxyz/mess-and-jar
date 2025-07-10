import { useEffect, useRef } from "react";
import { Message } from "../types";

interface MessageAreaProps {
    messages: Message[];
    currentUsername: string;
}

interface MessageItemProps {
    message: Message;
    isCurrentUser: boolean;
}

function MessageItem({ message, isCurrentUser }: MessageItemProps) {
    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
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
                <div className={message.msg !== "" ? "" : "text-gray-400"}>
                    {message.msg !== "" ? message.msg : "Unable to decrypt message"}
                </div>
            </div>
        </div>
    );
}

export default function MessageArea({ messages, currentUsername }: MessageAreaProps) {
    const messageAreaScrollRef = useRef<HTMLDivElement>(null);
    const isScrolledManuallyRef = useRef(false);
    const isTouchedBottomRef = useRef(false);

    useEffect(() => {
        if (!isScrolledManuallyRef.current || isTouchedBottomRef.current) {
            messageAreaScrollRef.current?.scrollTo({
                top: messageAreaScrollRef.current?.scrollHeight,
                behavior: "smooth"
            });
            isScrolledManuallyRef.current = false;
        }
    }, [messages]);

    useEffect(() => {
        window.addEventListener("message-sent", () => {
            setTimeout(() => {
                messageAreaScrollRef.current?.scrollTo({
                    top: messageAreaScrollRef.current?.scrollHeight + 300,
                    behavior: "smooth"
                });
            }, 200);
        });
    }, []);

    return (
        <div 
            className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0" 
            ref={messageAreaScrollRef}
            onScroll={(e) => {
                isScrolledManuallyRef.current = true;
                if (
                    (messageAreaScrollRef.current?.scrollTop ?? 0) + 
                    (messageAreaScrollRef.current?.clientHeight ?? 0) >= 
                    (messageAreaScrollRef.current?.scrollHeight ?? 0)
                ) {
                    isTouchedBottomRef.current = true;
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