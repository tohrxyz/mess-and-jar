import { useEffect, useRef, useState } from "react";
import { Message } from "../types";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { scrollToBottom } from "../lib/scroll-util";
import { MessageBubble } from "./MessageBubble";

interface MessageAreaProps {
    messages: Message[];
    currentUsername: string;
}

export default function MessageArea({ messages, currentUsername }: MessageAreaProps) {
    const { messageAreaScrollRef } = useRoomContext();
    const isScrolledManuallyRef = useRef(false);
    const isTouchedBottomRef = useRef(false);
    const isInitialRenderRef = useRef(true);
    const previousMessageCountRef = useRef(0);
    const [modalImage, setModalImage] = useState<string | null>(null);

    // Set initial scroll position to bottom without animation
    useEffect(() => {
        if (isInitialRenderRef.current && messageAreaScrollRef.current && messages.length > 0) {
            messageAreaScrollRef.current.scrollTop = messageAreaScrollRef.current.scrollHeight;
            isInitialRenderRef.current = false;
            previousMessageCountRef.current = messages.length;
        }
    }, [messages.length]);

    // Handle auto-scroll for new messages
    useEffect(() => {
        if (!isInitialRenderRef.current && messages.length > previousMessageCountRef.current) {
            if (!isScrolledManuallyRef.current || isTouchedBottomRef.current) {
                scrollToBottom(messageAreaScrollRef);
                isScrolledManuallyRef.current = false;
            }
            previousMessageCountRef.current = messages.length;
        }
    }, [messages]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") setModalImage(null);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <>
            <div 
                className="flex-1 overflow-y-scroll p-6 space-y-4 min-h-0 max-h-[calc(100vh-9.5rem)]" 
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
                        <MessageBubble
                            key={index}
                            message={message}
                            isCurrentUser={isCurrentUser}
                            onImageClick={setModalImage}
                        />
                    );
                })}
            </div>
            {modalImage && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setModalImage(null)}>
                    <button
                        aria-label="Close image view"
                        className="absolute top-4 right-4 z-10 p-2 bg-gray-800/50 text-white rounded-full hover:bg-gray-700/70 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            setModalImage(null);
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <img src={modalImage as string} className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </>
    );
} 