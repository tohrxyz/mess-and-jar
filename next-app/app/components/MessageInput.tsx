"use client";
import { useEffect, useRef, useState } from "react";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { mutateSendMessage, mutateUploadMedia } from "../mutations/message";
import { arrayBufferToHex, cryptoKeyFromRawExport, encryptSubtleClient, getNewIV, prepareBufferFromMessage, signMessage } from "../lib/crypto-client";
import { scrollToBottom } from "../lib/scroll-util";
import { useQueryClient } from "@tanstack/react-query";
import { v4 as uuid } from "uuid";
import { deleteOld, MAX_IMAGES_IN_CACHED_INDEX_DB, saveImage } from "../indexdb/media-db";
import { deleteMessage, getLastTimestamp, saveMessage } from "../indexdb/chat-db";
import { User } from "../types";
import { MESSAGE_CODES } from "../constants/messageCodes";

const ProgressBar = ({ isUploading, error }: { isUploading: boolean, error: null | Error }) => {
    if (isUploading) {
        return (
            <div className="absolute bottom-full left-0 right-0 bg-gray-800 border-b border-gray-700 px-4 py-2">
                <div className="flex items-center space-x-2 text-sm">
                    <div className="size-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-400">Uploading media...</span>
                </div>
                <div className="mt-1 w-full bg-gray-700 rounded-full h-1">
                    <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="absolute bottom-full left-0 right-0 bg-gray-800 border-b border-gray-700 px-4 py-2">
                <div className="flex items-center space-x-2 text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3 text-red-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span className="text-red-400">{error.message}</span>
                </div>
            </div>
        );
    }
    
    return null;
}

export default function MessageInput() {
    const [error, setError] = useState<null | Error>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isVoiceReady, setIsVoiceReady] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const { inputMessage, setInputMessage, room, user, lastTimestampRef, messageAreaScrollRef } = useRoomContext();
    const queryClient = useQueryClient();
    const [audioUrl, setAudioUrl] = useState<undefined | string>(undefined)
    const mediaRecorder = useRef<MediaRecorder | null>(null)
    const chunks = useRef<Blob[]>([])
    const [isPlayingAudio, setIsPlayingAudio] = useState(false)

    const startVoiceRecording = async (): Promise<void> => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorder.current = new window.MediaRecorder(stream)
        mediaRecorder.current.ondataavailable = e => chunks.current.push(e.data)
        mediaRecorder.current.onstop = () => {
            const blob = new Blob(chunks.current, { type: 'audio/webm' })
            setAudioUrl(URL.createObjectURL(blob))
            chunks.current = []
            stream.getTracks().forEach(track => track.stop())
        }
        mediaRecorder.current.start()
    };

    const stopVoiceRecording = async (): Promise<void> => {
        mediaRecorder.current && mediaRecorder.current.stop()
    };

    const sendVoiceRecording = async (): Promise<void> => {
        if (!audioUrl) return;
        if (!room || !room?.password) throw new Error(`Can't access room [${room?.id}] password.`)

        setIsUploading(true)
        try {
            const response = await fetch(audioUrl);
            const blob = await response.blob();
            const audioAsArrBuff = await blob.arrayBuffer()
    
            const key = await cryptoKeyFromRawExport(room.password)
            const { raw: iv, hex: ivHex } = getNewIV()
    
            const newFileId = ivHex + "_" + uuid()
            const msgInjected = MESSAGE_CODES.AUDIO.START + newFileId + MESSAGE_CODES.AUDIO.END
            const encryptedBinary = await encryptSubtleClient(audioAsArrBuff, { iv, key })
            const res = await mutateUploadMedia(encryptedBinary, newFileId)
            if (res.success) {
                const date = Date.now()
                await saveImage({ id: newFileId, timestamp: date, blob: blob})
                await deleteOld(MAX_IMAGES_IN_CACHED_INDEX_DB)
                await handleSendMessage(msgInjected, date.toString())
            } else {
                throw new Error("Failed to upload media")
            }
            setIsVoiceReady(false);
            setRecordingSeconds(0);
        } catch(e) {
            console.log("Error with uploading audio: ", e)
        }
        setIsUploading(false)
    };

    useEffect(() => {
        if (!isRecording) return;
        const intervalId = setInterval(() => {
            setRecordingSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(intervalId);
    }, [isRecording]);

    const formatDuration = (totalSeconds: number): string => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    };

    const handleSendMessage = async (msg: string, forcedDate?: string): Promise<null | Error> => {
        const userObj = JSON.parse(user ?? "{}") as User;
        const date = forcedDate ?? Date.now().toString();

        const key = await cryptoKeyFromRawExport(room?.password ?? "")
        const { raw: iv, hex: ivHex } = getNewIV()

        const encryptedContent = await encryptSubtleClient(msg, { key, iv })
        const encryptedContentHex = arrayBufferToHex(encryptedContent)
        const encryptedMessageTransit = `${ivHex}_${encryptedContentHex}`

        const preparedMessageBuffToSign = await prepareBufferFromMessage({
            date,
            room: room?.id ?? "general",
            username: userObj.username,
            msg,
        })

        const signature = await signMessage({ messageBuffer: preparedMessageBuffToSign, privateKeyHex: userObj.identityKeypairHex.privateKeyHex })
        
        // optimistically save
        saveMessage({
            id: `${date}-${userObj.username}-${room?.id ?? "general"}`,
            date,
            room: room?.id ?? "general",
            username: userObj.username,
            msg: encryptedMessageTransit,
            signature: signature.signatureHex,
            identity_pubkey: userObj.identityKeypairHex.privateKeyHex
        });
        lastTimestampRef.current = Number(date);

        const response = await mutateSendMessage(
            room?.id ?? "general", 
            userObj.username, 
            encryptedMessageTransit, 
            date,
            signature.signatureHex
        );
        
        if (response.success) {
            setInputMessage("");
            await queryClient.invalidateQueries({ queryKey: ["messages", room?.id, lastTimestampRef.current] });
            scrollToBottom(messageAreaScrollRef);
            return null;
        } else {
            // rollback
            await deleteMessage(`${date}-${userObj.username}-${room?.id ?? "general"}`);
            const latestTimestamp = await getLastTimestamp(room?.id ?? "general");
            lastTimestampRef.current = latestTimestamp;
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

            const key = await cryptoKeyFromRawExport(room.password)
            const { raw: iv, hex: ivHex } = getNewIV()

            const encryptedBinary = await encryptSubtleClient(loadedFile, { key, iv })

            if (!encryptedBinary) throw new Error(`Can't encrypt the media`)

            const newFileId = `${ivHex}_${uuid()}`
            const res = await mutateUploadMedia(encryptedBinary, newFileId)
            setIsUploading(false);

            let msgInjected = ""
            if (file.type.startsWith("image")) {
                msgInjected = `${MESSAGE_CODES.PHOTO.START}${newFileId}${MESSAGE_CODES.PHOTO.END}`
            } else if (file.type.startsWith("video")) {
                msgInjected = MESSAGE_CODES.VIDEO.START + newFileId + MESSAGE_CODES.VIDEO.END
            } else {
                throw new Error("Unsupported media type")
            }
            if (res.success) {
                const date = Date.now()
                await saveImage({ id: newFileId, timestamp: date, blob: new Blob([loadedFile])})
                await deleteOld(MAX_IMAGES_IN_CACHED_INDEX_DB)
                await handleSendMessage(msgInjected, date.toString())
            } else {
                throw new Error("Failed to upload media")
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error("Unknown upload error"));
            setTimeout(() => {
                setError(null);
            }, 5000);
        }
    }

    return (
        <div className="bg-gray-800 border-t border-gray-700 relative">
            <ProgressBar isUploading={isUploading} error={error} />
            
            <div className="flex space-x-2 py-2 pl-2 pr-2">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-2 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleOnKeyDown}
                    suppressHydrationWarning
                    disabled={isUploading}
                />
                {!isRecording && !isVoiceReady && (
                    <>
                        <input
                            type="file"
                            id="file-input"
                            className="hidden"
                            accept="image/*,video/mp4"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    handleSendMedia(file);
                                }
                            }}
                            disabled={isUploading}
                        />
                        <button 
                            className={`p-2 rounded-lg transition-all duration-200 ${
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
                            aria-label="Choose file"
                            title="Choose file"
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
                    </>
                )}
                <button 
                    className={`rounded-lg transition-all duration-300 flex items-center ${
                        isUploading
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed p-2"
                            : isRecording
                                ? "bg-red-600 hover:bg-red-700 text-white pl-3 pr-4 py-2 w-52 sm:w-64"
                                : isVoiceReady
                                    ? "bg-red-600 text-white pl-3 pr-4 py-2 w-52 sm:w-64 cursor-default"
                                    : "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-2"
                    }`}
                    onClick={async () => {
                        if (isUploading) return;
                        if (isVoiceReady) return; // prevent restarting when ready
                        if (isRecording) {
                            await stopVoiceRecording();
                            setIsRecording(false);
                            setIsVoiceReady(true);
                        } else {
                            setRecordingSeconds(0);
                            setIsRecording(true);
                            setIsVoiceReady(false);
                            await startVoiceRecording();
                        }
                    }}
                    disabled={isUploading}
                    aria-pressed={isRecording}
                    aria-label={isRecording ? "Stop recording" : (isVoiceReady ? "Voice recording ready" : "Start voice recording")}
                    title={isRecording ? "Stop recording" : (isVoiceReady ? "Voice recording ready" : "Start voice recording")}
                >
                    {isRecording ? (
                        <div className="flex items-center gap-3 w-full justify-between">
                            <div className="flex items-end gap-1" aria-hidden>
                                <span className="w-1.5 h-4 bg-white/80 rounded-sm recording-wave" style={{ animationDelay: "0ms" }}></span>
                                <span className="w-1.5 h-6 bg-white/80 rounded-sm recording-wave" style={{ animationDelay: "150ms" }}></span>
                                <span className="w-1.5 h-8 bg-white/80 rounded-sm recording-wave" style={{ animationDelay: "300ms" }}></span>
                                <span className="w-1.5 h-6 bg-white/80 rounded-sm recording-wave" style={{ animationDelay: "450ms" }}></span>
                                <span className="w-1.5 h-4 bg-white/80 rounded-sm recording-wave" style={{ animationDelay: "600ms" }}></span>
                            </div>
                            <div className="text-sm font-mono tabular-nums">{formatDuration(recordingSeconds)}</div>
                            <div className="flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5 fill-white"><rect x="7" y="7" width="10" height="10" rx="1.5"></rect></svg>
                            </div>
                        </div>
                    ) : isVoiceReady ? (
                        <div className="flex items-center gap-3 w-full justify-between">
                            <div className="text-sm font-mono tabular-nums">{formatDuration(recordingSeconds)}</div>
                            <div className="flex items-center justify-center gap-2">
                                <span
                                    className="inline-flex p-1 rounded hover:bg-white/10 active:bg-white/20 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const audio = document.getElementById('voice-preview-audio') as HTMLAudioElement;
                                        if (audio.paused) {
                                            setIsPlayingAudio(true)
                                            audio.play();
                                        } else {
                                            setIsPlayingAudio(false)
                                            audio.pause();
                                        }
                                    }}
                                    role="button"
                                    aria-label="Play/pause recording preview"
                                    title="Play/pause recording preview"
                                >
                                    {isPlayingAudio ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                                            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                                            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </span>
                                <audio 
                                    id="voice-preview-audio" 
                                    src={audioUrl} 
                                    style={{ display: 'none' }}
                                    onEnded={() => setIsPlayingAudio(false)}
                                />
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5 fill-white"><path d="M9 12.75 11.25 15 15 9.75"/></svg>
                                <span
                                    className="inline-flex p-1 rounded hover:bg-white/10 active:bg-white/20 transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (isUploading) return;
                                        setIsVoiceReady(false);
                                        setRecordingSeconds(0);
                                    }}
                                    role="button"
                                    aria-label="Discard recording"
                                    title="Discard recording"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12M9.75 7.5v-1.5a1.5 1.5 0 0 1 1.5-1.5h1.5a1.5 1.5 0 0 1 1.5 1.5v1.5m-7.5 0l.867 12.142A2.25 2.25 0 0 0 9.867 22.5h4.266a2.25 2.25 0 0 0 2.25-2.358L17.25 7.5" />
                                    </svg>
                                </span>
                            </div>
                        </div>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                        </svg>
                    )}
                </button>
                <button 
                    className={`bg-blue-600 hover:bg-blue-700 text-white px-2 rounded-lg font-medium transition-colors duration-200 ${
                        error ? "opacity-50 cursor-not-allowed bg-red-500 hover:bg-red-600 duration-100" : ""
                    } ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`} 
                    onClick={async () => {
                        if (isVoiceReady) {
                            await sendVoiceRecording();
                            return;
                        }
                        await handleSendMessage(inputMessage);
                    }}
                    disabled={(inputMessage.length === 0 && !isVoiceReady) || error !== null || isUploading}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.876L5.999 12Zm0 0h7.5" />
                    </svg>
                </button>
            </div>
        </div>
    );
} 