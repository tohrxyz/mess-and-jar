"use client";
import { useState } from "react";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { mutateSendMessage, mutateUploadMedia } from "../mutations/message";
import { encryptBinaryClient, encryptStringClient } from "../lib/crypto-client";
import { scrollToBottom } from "../lib/scroll-util";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuid } from "uuid";
import { deleteOld, MAX_IMAGES_IN_CACHED_INDEX_DB, saveImage } from "../indexdb/media-db";

export default function MessageInput() {
    const [error, setError] = useState<null | Error>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { inputMessage, setInputMessage, room, user, setMessages, lastTimestampRef, messageAreaScrollRef } = useRoomContext();
    const queryClient = useQueryClient();

    const handleSendMessage = async (msg: string): Promise<null | Error> => {
        const userObj = JSON.parse(user ?? "{}") as { username: string };
        const date = Date.now().toString();
        const encryptedMessage = encryptStringClient(msg, room?.password ?? "");
        const response = await mutateSendMessage(room?.id ?? "general", userObj.username, encryptedMessage, date);
        if (response.success) {
            setInputMessage("");
            await queryClient.invalidateQueries({ queryKey: ["messages", room?.id, lastTimestampRef.current] });
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

    const handleSendMedia = async (file: File) => {
        setIsUploading(true);
        setError(null);
        
        try {
            if (!room || !room?.password) throw new Error(`Can't access room [${room?.id}] password.`)
            const loadedFile = await file.arrayBuffer()
            const encryptedBinary = encryptBinaryClient(loadedFile, room?.password)
            if (!encryptedBinary) throw new Error(`Can't encrypt the media`)

            const newFileId = uuid()
            const res = await mutateUploadMedia(encryptedBinary, newFileId)

            const msgInjected = `<<<$#!${newFileId}!#$>>>`
            if (res.success) {
                await saveImage({ id: newFileId, timestamp: Date.now(), blob: new Blob([loadedFile])})
                await deleteOld(MAX_IMAGES_IN_CACHED_INDEX_DB)
                await handleSendMessage(msgInjected)
            } else {
                throw new Error("Failed to upload media")
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Unknown upload error"));
            setTimeout(() => {
                setError(null);
            }, 5000);
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex-shrink-0 relative">
            {(isUploading || error) && (
                <div className="absolute bottom-13 px-2 w-full left-0 bg-gray-800 py-2">
                    <div className="flex items-center space-x-2 text-sm">
                        {isUploading ? (
                            <>
                                <div className="size-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-gray-400">Uploading media...</span>
                            </>
                        ) : error ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3 text-red-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                                </svg>
                                <span className="text-red-400">{error.message}</span>
                            </>
                        ) : null}
                    </div>
                    {isUploading && (
                        <div className="mt-1 w-full bg-gray-700 rounded-full h-1">
                            <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                    )}
                </div>
            )}
            <div className="flex space-x-4">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleOnKeyDown}
                    suppressHydrationWarning
                    disabled={isUploading}
                />
                <input
                    type="file"
                    id="file-input"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            handleSendMedia(file);
                        }
                    }}
                    disabled={isUploading}
                />
                <button 
                    className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                        isUploading 
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed" 
                            : "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
                    }`}
                    onClick={() => {
                        if (!isUploading) {
                            document.getElementById('file-input')?.click();
                        }
                    }}
                    disabled={isUploading}
                >
                    {isUploading ? (
                        <div className="size-5 flex items-center justify-center">
                            <div className="size-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                        </svg>
                    )}
                </button>
                <button 
                    className={`bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg font-medium transition-colors duration-200 ${
                        error ? "opacity-50 cursor-not-allowed bg-red-500 hover:bg-red-600 duration-100" : ""
                    } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`} 
                    onClick={() => handleSendMessage(inputMessage)}
                    disabled={inputMessage.length === 0 || error !== null || isUploading}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
                    </svg>
                </button>
            </div>
        </div>
    );
} 