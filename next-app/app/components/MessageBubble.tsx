import { useEffect, useState, useRef, memo } from "react";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { Message } from "../types";
import { cryptoKeyFromRawExport, decryptSubtleClient, hexToArrayBuffer } from "../lib/crypto-client";
import { mutateDownloadMedia } from "../mutations/message";
import { deleteOld, getImage, MAX_IMAGES_IN_CACHED_INDEX_DB, saveImage } from "../indexdb/media-db";
import { extractIdFromImageSource, formatFileSize } from "../lib/format-util";

interface MessageItemProps {
    message: Message;
    isCurrentUser: boolean;
    onImageClick: (src: string) => void;
    messageIndex: number;
}

export const MessageBubble = memo(({ message, isCurrentUser, onImageClick, messageIndex }: MessageItemProps) => {
    const { room, openInfoMenuId, setOpenInfoMenuId } = useRoomContext();
    const [displayText, setDisplayText] = useState<string>(message.msg.startsWith("<<<$#!") ? "" : message.msg);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isImagePlaceholder, setIsImagePlaceholder] = useState<boolean>(false);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied'>('idle');
    const [isLongPress, setIsLongPress] = useState<boolean>(false);
    const [menuPosition, setMenuPosition] = useState<'above' | 'below'>('below');
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const fileSizeRef = useRef<string | null>(null)
    
    // Create unique identifier for this message
    const messageId = `${messageIndex}-${message.date}`;
    const showInfoMenu = openInfoMenuId === messageId;
    
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

    const formatDate = (dateString: string) => {
        const date = new Date(Number(dateString));
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const handleCopyMessage = async () => {
        if (copyStatus !== 'idle') return;
        
        setCopyStatus('copying');
        try {
            await navigator.clipboard.writeText(displayText);
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } catch (error) {
            console.error('Failed to copy message:', error);
            setCopyStatus('idle');
        }
    };

    const handleDeleteMessage = () => {
        // Show not implemented notice
        alert('Delete functionality not implemented yet');
    };

    const handleTouchStart = () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = setTimeout(() => {
            setIsLongPress(true);
            setOpenInfoMenuId(showInfoMenu ? null : messageId);
        }, 450); // ~0.45s long-press
    };

    const handleTouchEnd = () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
    };

    // Reset long-press highlight when the menu closes
    useEffect(() => {
        if (!showInfoMenu) {
            setIsLongPress(false);
        }
    }, [showInfoMenu]);

    // Auto-close the info menu after the bubble has been outside the viewport for ≥10 s
    const bubbleRef = useRef<HTMLDivElement | null>(null);
    const notVisibleTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate menu position based on available space
    useEffect(() => {
        if (!showInfoMenu || !bubbleRef.current) return;

        const updateMenuPosition = () => {
            const bubbleRect = bubbleRef.current?.getBoundingClientRect();
            if (!bubbleRect) return;

            // Find the scrollable message area container
            const messageArea = bubbleRef.current?.closest('.overflow-y-auto');
            const containerRect = messageArea?.getBoundingClientRect();
            
            if (!containerRect) {
                // Fallback to viewport if container not found
                const viewportHeight = window.innerHeight;
                const menuHeight = 200;
                const spaceBelow = viewportHeight - bubbleRect.bottom;
                const spaceAbove = bubbleRect.top;
                setMenuPosition(spaceBelow >= menuHeight || spaceBelow >= spaceAbove ? 'below' : 'above');
                return;
            }

            const menuHeight = 200; // Approximate height of the menu
            const spaceBelow = containerRect.bottom - bubbleRect.bottom;
            const spaceAbove = bubbleRect.top - containerRect.top;

            // Position menu below if there's enough space, otherwise above
            if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
                setMenuPosition('below');
            } else {
                setMenuPosition('above');
            }
        };

        updateMenuPosition();
        
        // Listen to scroll events on the message area container
        const messageArea = bubbleRef.current?.closest('.overflow-y-auto');
        if (messageArea) {
            messageArea.addEventListener('scroll', updateMenuPosition);
        }
        window.addEventListener('resize', updateMenuPosition);

        return () => {
            if (messageArea) {
                messageArea.removeEventListener('scroll', updateMenuPosition);
            }
            window.removeEventListener('resize', updateMenuPosition);
        };
    }, [showInfoMenu]);

    useEffect(() => {
        if (!showInfoMenu) return;

        const node = bubbleRef.current;
        if (!node) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                // In view → clear any pending close timer
                if (notVisibleTimerRef.current) {
                    clearTimeout(notVisibleTimerRef.current);
                    notVisibleTimerRef.current = null;
                }
            } else {
                // Out of view → start 10 s timer to auto-close
                if (!notVisibleTimerRef.current) {
                    notVisibleTimerRef.current = setTimeout(() => {
                        setOpenInfoMenuId(null);
                    }, 10000);
                }
            }
        });

        observer.observe(node);

        return () => {
            observer.disconnect();
            if (notVisibleTimerRef.current) {
                clearTimeout(notVisibleTimerRef.current);
                notVisibleTimerRef.current = null;
            }
        };
    }, [showInfoMenu]);

    useEffect(() => {
        let isMounted = true;
        const processMessage = async () => {
            // Check if the decrypted message is a media placeholder
            const mediaPrefix = "<<<$#!";
            const mediaSuffix = "!#$>>>";
            if (message.msg.startsWith(mediaPrefix) && message.msg.endsWith(mediaSuffix)) {
                const fileId = message.msg.slice(mediaPrefix.length, message.msg.length - mediaSuffix.length); 
                
                // Always show placeholder first for media messages
                if (isMounted) {
                    setIsImagePlaceholder(true);
                }
                
                try {
                    if (!isMounted) return;

                    const image = await getImage(fileId)
                    if (image) {
                        const blob = new Blob([image.blob])
                        fileSizeRef.current = formatFileSize(blob.size)
                        const url = URL.createObjectURL(blob)
                        setImageSrc(url)
                        return
                    }

                    const resp = await mutateDownloadMedia(fileId)
                    if (!resp.success || !resp.data) {
                        throw new Error("Download failed");
                    }

                    const [ivHex, _] = fileId.split("_")
                    const iv = new Uint8Array(hexToArrayBuffer(ivHex))
                    const key = await cryptoKeyFromRawExport(room?.password ?? "")

                    const decryptedBinary = await decryptSubtleClient(resp.data, { key, iv })

                    if (!decryptedBinary) {
                        throw new Error("Decrypt failed");
                    }

                    const blob = new Blob([decryptedBinary]);
                    fileSizeRef.current = formatFileSize(blob.size)
                    const url = URL.createObjectURL(blob);

                    if (isMounted) {
                        await saveImage({ id: fileId, timestamp: Date.now(), blob})
                        await deleteOld(MAX_IMAGES_IN_CACHED_INDEX_DB)
                        setImageSrc(url);
                    }
                } catch (error) {
                    if (isMounted) {
                        setDisplayText("Unable to load media: " + error);
                        setIsImagePlaceholder(false);
                    }
                }
                return;
            }

            // Not a media placeholder -> display text immediately
            if (isMounted) {
                setDisplayText(message.msg);
            }
        };

        processMessage();

        return () => {
            isMounted = false;
            if (imageSrc && imageSrc.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
        };
    }, [message.msg, room?.password]);

    const isMedia = Boolean(imageSrc) || isImagePlaceholder;

    return (
        <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} relative`}>
            <div className={`group flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-center gap-2 ${!isCurrentUser ? 'flex-row-reverse' : ''}`}>
                <button
                    onClick={() => setOpenInfoMenuId(showInfoMenu ? null : messageId)}
                    className={`mt-1 p-1 rounded-full hover:bg-gray-600 transition-colors ${showInfoMenu ? 'bg-gray-600' : 'bg-transparent'} ${showInfoMenu || isLongPress ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-150 select-none`}
                    title="Message info"
                >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 16v-4"></path>
                        <path d="M12 8h.01"></path>
                    </svg>
                </button>
                <div
                    className={`${isMedia ? 'max-w-md sm:max-w-lg lg:max-w-xl' : 'max-w-xs lg:max-w-md'} px-4 py-2 rounded-[20px] ${isCurrentUser ? 'rounded-br-none' : 'rounded-bl-none'} ${
                        isCurrentUser
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-100'
                    }`}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    ref={bubbleRef}
                >
                    {!isCurrentUser && (
                        <div className="text-xs font-medium mb-1 opacity-75 select-none">
                            {message.username}
                        </div>
                    )}
                    {imageSrc ? (
                        <div className="relative w-full max-h-96 min-w-64 cursor-zoom-in" onClick={() => imageSrc && onImageClick(imageSrc)}>
                            <img 
                                src={imageSrc} 
                                alt="media" 
                                className="w-full h-auto max-h-96 object-contain rounded select-none pointer-events-none"
                                style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
                                onContextMenu={(e) => e.preventDefault()}
                                onDragStart={(e) => e.preventDefault()}
                            />
                        </div>
                    ) : isImagePlaceholder ? (
                        <div className="w-full aspect-[2/3] bg-gray-600 animate-pulse rounded min-w-64 select-none" />
                    ) : (
                        <div className={`select-none ${displayText !== "" && !displayText.includes("Unable to decrypt") ? "" : "text-gray-400"} break-all`}>{displayText !== "" ? renderMessageWithLinks(displayText) : (message.msg.startsWith("<<<$#!") ? "Loading media..." : "Unable to decrypt message")}</div>
                     )}
                </div>
            </div>

            {showInfoMenu && (
                <div className={`absolute z-50 p-3 bg-gray-800 rounded-lg border border-gray-600 shadow-lg min-w-48 ${
                    menuPosition === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'
                } ${isCurrentUser ? 'right-0' : 'left-0'}`}>
                    <div className="space-y-3">
                        <div className="text-xs text-gray-300 select-none">
                            <span className="font-bold">Sent</span> {formatDate(message.date)}
                        </div>
                        
                        <div className="text-xs text-gray-300 select-none">
                            <span className="font-bold">From</span> {message.username}
                        </div>

                        {isMedia && imageSrc && (
                            <div className="text-xs text-gray-300 select-none">
                                <span className="font-bold">Size</span> {fileSizeRef.current}
                            </div>
                        )}
                        
                        <div className="flex flex-col gap-2">
                            {!isMedia && <button
                                onClick={handleCopyMessage}
                                disabled={copyStatus !== 'idle' || isMedia}
                                className={`flex cursor-pointer disabled:cursor-not-allowed select-none items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                    isMedia 
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                        : copyStatus === 'copied'
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {copyStatus === 'copying' ? (
                                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                ) : copyStatus === 'copied' ? (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                ) : (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                                {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                            </button> }

                            {isMedia && imageSrc && (
                                <a
                                    href={imageSrc}
                                    download={`mess_and_jar-${extractIdFromImageSource(imageSrc)}.jpeg`}
                                    className="flex cursor-pointer select-none items-center gap-1 px-2 py-1 text-xs rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download
                                </a>
                            )}
                            
                            <button
                                onClick={handleDeleteMessage}
                                disabled
                                className="flex select-none items-center gap-1 px-2 py-1 text-xs rounded bg-gray-700 text-gray-500 cursor-not-allowed transition-colors"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
})