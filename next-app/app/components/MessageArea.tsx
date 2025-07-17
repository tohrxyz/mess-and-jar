import { useEffect, useRef, useState } from "react";
import { Message } from "../types";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { scrollToBottom } from "../lib/scroll-util";
import { decryptStringClient, decryptBinaryClient } from "../lib/crypto-client";
import { mutateDownloadMedia } from "../mutations/message";

interface MessageAreaProps {
    messages: Message[];
    currentUsername: string;
}

interface MessageItemProps {
    message: Message;
    isCurrentUser: boolean;
}

function MessageItem({ message, isCurrentUser }: MessageItemProps) {
    const { room } = useRoomContext();
    const [displayText, setDisplayText] = useState<string>("");
    const [isDecrypting, setIsDecrypting] = useState<boolean>(true);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    
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

    const generateGlitchText = (length: number) => {
        const chars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    };

    useEffect(() => {
        let isMounted = true;
        let glitchInterval: NodeJS.Timeout | null = null;

        const processMessage = async () => {
            if (!room?.password || !message.msg) {
                if (isMounted) {
                    setDisplayText(message.msg || "Unable to decrypt message");
                    setIsDecrypting(false);
                }
                return;
            }

            // Try to decrypt the message (text placeholder)
            const decryptedMessage = message.isSentFromClient ? message.msg : decryptStringClient(message.msg, room.password);

            if (!decryptedMessage) {
                if (isMounted) {
                    setDisplayText("Unable to decrypt message");
                    setIsDecrypting(false);
                }
                return;
            }

            // Check if the decrypted message is a media placeholder
            const mediaPrefix = "<<<$#!";
            const mediaSuffix = "!#$>>>";
            if (decryptedMessage.startsWith(mediaPrefix) && decryptedMessage.endsWith(mediaSuffix)) {
                const fileId = decryptedMessage.slice(mediaPrefix.length, decryptedMessage.length - mediaSuffix.length);
                try {
                    const resp = await mutateDownloadMedia(fileId);
                    if (!resp.success || !resp.data) {
                        throw new Error("Download failed");
                    }

                    // Convert ArrayBuffer -> string (encrypted binary)
                    const encryptedString = new TextDecoder().decode(new Uint8Array(resp.data));

                    // Decrypt binary
                    const decryptedBinary = decryptBinaryClient(encryptedString, room.password);
                    if (!decryptedBinary) {
                        throw new Error("Decrypt failed");
                    }

                    // Create object URL for image
                    const blob = new Blob([decryptedBinary]);
                    const url = URL.createObjectURL(blob);

                    if (isMounted) {
                        setImageSrc(url);
                        setIsDecrypting(false);
                    }
                } catch (error) {
                    if (isMounted) {
                        setDisplayText("Unable to load media");
                        setIsDecrypting(false);
                    }
                }
                return;
            }

            // Not a media placeholder -> do glitch animation then display text
            let glitchCount = 0;
            const maxGlitches = 8;
            glitchInterval = setInterval(() => {
                if (!isMounted) return;
                if (glitchCount < maxGlitches) {
                    setDisplayText(generateGlitchText(decryptedMessage.length));
                    glitchCount++;
                } else {
                    setDisplayText(decryptedMessage);
                    setIsDecrypting(false);
                    if (glitchInterval) clearInterval(glitchInterval);
                }
            }, 50);
        };

        processMessage();

        return () => {
            isMounted = false;
            if (glitchInterval) clearInterval(glitchInterval);
            if (imageSrc) URL.revokeObjectURL(imageSrc);
        };
    }, [message.msg, room?.password]);

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
                {imageSrc ? (
                    <img src={imageSrc} alt="media" className="max-w-full h-auto rounded" />
                ) : (
                    <div className={`${displayText !== "" && !displayText.includes("Unable to decrypt") ? "" : "text-gray-400"} break-all ${isDecrypting ? 'animate-pulse' : ''}`}>
                        {displayText !== "" ? (isDecrypting ? displayText : renderMessageWithLinks(displayText)) : "Unable to decrypt message"}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function MessageArea({ messages, currentUsername }: MessageAreaProps) {
    const { messageAreaScrollRef } = useRoomContext();
    const isScrolledManuallyRef = useRef(false);
    const isTouchedBottomRef = useRef(false);
    const isInitialRenderRef = useRef(true);
    const previousMessageCountRef = useRef(0);

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

    return (
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