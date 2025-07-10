import { useEffect, useRef } from "react";
import { Message } from "../types";

interface MessageAreaProps {
    messages: Message[];
    currentUsername: string;
}

export default function MessageArea({ messages, currentUsername }: MessageAreaProps) {
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const isScrolledManuallyRef = useRef(false);
    const isTouchedBottomRef = useRef(false);

    useEffect(() => {
        if (!isScrolledManuallyRef.current || isTouchedBottomRef.current) {
            scrollAreaRef.current?.scrollTo({
                top: scrollAreaRef.current?.scrollHeight,
                behavior: "smooth"
            });
            isScrolledManuallyRef.current = false;
        }
    }, [messages]);

    return (
        <div 
            className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0" 
            ref={scrollAreaRef}
            onScroll={(e) => {
                if (!isScrolledManuallyRef.current) {
                    isScrolledManuallyRef.current = true;
                }

                if ((scrollAreaRef.current?.scrollTop ?? 0) + (scrollAreaRef.current?.clientHeight ?? 0) >= (scrollAreaRef.current?.scrollHeight ?? 0)) {
                    isTouchedBottomRef.current = true;
                } else if (isTouchedBottomRef.current) {
                    isTouchedBottomRef.current = false;
                }
            }}
        >
            {messages.map((message, index) => {
                const isCurrentUser = message.username === currentUsername;
                return (
                    <div
                        key={index}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
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
            })}
        </div>
    );
} 