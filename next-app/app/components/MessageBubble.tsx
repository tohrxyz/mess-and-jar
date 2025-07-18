import { useEffect, useState } from "react";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { Message } from "../types";
import { decryptBinaryClient, decryptStringClient } from "../lib/crypto-client";
import { mutateDownloadMedia } from "../mutations/message";
import { deleteOld, getImage, MAX_IMAGES_IN_CACHED_INDEX_DB, saveImage, useImage } from "../indexdb/media-db";

interface MessageItemProps {
    message: Message;
    isCurrentUser: boolean;
    onImageClick: (src: string) => void;
}

export function MessageBubble({ message, isCurrentUser, onImageClick }: MessageItemProps) {
    const { room } = useRoomContext();
    const [displayText, setDisplayText] = useState<string>("");
    const [isDecrypting, setIsDecrypting] = useState<boolean>(true);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isImagePlaceholder, setIsImagePlaceholder] = useState<boolean>(false);
    // const [imageId, setImageId] = useState<string | null>(null)
    // const image = useImage(imageId)
    
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
                const image = await getImage(fileId)
                if (isMounted) {
                    setIsImagePlaceholder(true);
                }

                try {
                    if (!isMounted) return
                    if (image) {
                        const blob = new Blob([image.blob])
                        const url = URL.createObjectURL(blob)
                        setImageSrc(url)
                        setIsDecrypting(false)
                        return
                    }

                    const resp = await mutateDownloadMedia(fileId)
                    if (!resp.success || !resp.data) {
                        throw new Error("Download failed");
                    }

                    // Convert ArrayBuffer -> string (encrypted binary)
                    const encryptedString = new TextDecoder().decode(new Uint8Array(resp.data)).trim();

                    // Decrypt binary
                    const decryptedBinary = decryptBinaryClient(encryptedString, room.password);
                    if (!decryptedBinary) {
                        throw new Error("Decrypt failed");
                    }

                    const blob = new Blob([decryptedBinary]);
                    const url = URL.createObjectURL(blob);

                    if (isMounted) {
                        await saveImage({ id: fileId, timestamp: Date.now(), blob})
                        await deleteOld(MAX_IMAGES_IN_CACHED_INDEX_DB)
                        setImageSrc(url);
                        setIsDecrypting(false);
                    }
                } catch (error) {
                    if (isMounted) {
                        setDisplayText("Unable to load media: " + error);
                        setIsDecrypting(false);
                        setIsImagePlaceholder(false);
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
            if (imageSrc && imageSrc.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
        };
    }, [message.msg, room?.password]);

    const isMedia = Boolean(imageSrc) || isImagePlaceholder;

    return (
        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`${isMedia ? 'max-w-md sm:max-w-lg lg:max-w-xl' : 'max-w-xs lg:max-w-md'} px-4 py-2 rounded-[20px] ${isCurrentUser ? 'rounded-br-none' : 'rounded-bl-none'} ${
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
                    <div className="relative w-full aspect-[2/3] min-w-64 cursor-zoom-in" onClick={() => imageSrc && onImageClick(imageSrc)}>
                        <img src={imageSrc} alt="media" className="absolute inset-0 w-full h-full object-cover rounded" />
                    </div>
                ) : isImagePlaceholder ? (
                    <div className="w-full aspect-[2/3] bg-gray-600 animate-pulse rounded min-w-64" />
                ) : (
                    <div className={`${displayText !== "" && !displayText.includes("Unable to decrypt") ? "" : "text-gray-400"} break-all ${isDecrypting ? 'animate-pulse' : ''}`}>{displayText !== "" ? (isDecrypting ? displayText : renderMessageWithLinks(displayText)) : "Unable to decrypt message"}</div>
                 )}
            </div>
        </div>
    );
}