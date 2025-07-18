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
    const [showScrollButton, setShowScrollButton] = useState(false);

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

    const handleScrollToBottom = () => {
        scrollToBottom(messageAreaScrollRef);
        isScrolledManuallyRef.current = false;
        setShowScrollButton(false);
    };

    return (
        <>
            <div className="relative h-full flex flex-col">
                <div 
                    className="flex-1 overflow-y-auto p-6 space-y-4" 
                    ref={messageAreaScrollRef}
                    onScroll={(e) => {
                        if (!isScrolledManuallyRef.current) {
                            isScrolledManuallyRef.current = true;
                        }
                        
                        const isAtBottom = (
                            (messageAreaScrollRef.current?.scrollTop ?? 0) + 
                            (messageAreaScrollRef.current?.clientHeight ?? 0) >= 
                            (messageAreaScrollRef.current?.scrollHeight ?? 0) - 20
                        );

                        if (isAtBottom) {
                            isTouchedBottomRef.current = true;
                            isScrolledManuallyRef.current = false;
                            setShowScrollButton(false);
                        } else {
                            if (isTouchedBottomRef.current) {
                                isTouchedBottomRef.current = false;
                            }
                            setShowScrollButton(true);
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
                
                {showScrollButton && (
                    <button
                        onClick={handleScrollToBottom}
                        className="absolute bottom-4 right-4 z-10 bg-gray-700 hover:bg-gray-600 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        aria-label="Scroll to bottom"
                    >
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </button>
                )}
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