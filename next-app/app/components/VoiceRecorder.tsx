"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useRoomContext } from "../chat/[room_id]/RoomContext";
import { mutateUploadMedia } from "../mutations/message";
import { cryptoKeyFromRawExport, encryptSubtleClient, getNewIV } from "../lib/crypto-client";
import { MESSAGE_CODES } from "../constants/messageCodes";
import { deleteOld, MAX_IMAGES_IN_CACHED_INDEX_DB, saveImage } from "../indexdb/media-db";

export interface VoiceRecorderHandle {
    isVoiceReady: boolean;
    sendVoiceRecording: () => Promise<void>;
}

type VoiceRecorderProps = {
    isUploading: boolean;
    setIsUploading: (value: boolean) => void;
    onVoiceReadyChange?: (ready: boolean) => void;
    onRecordingChange?: (recording: boolean) => void;
    handleSendMessage: (msg: string, forcedDate?: string) => Promise<null | Error>;
};

const VoiceRecorder = forwardRef<VoiceRecorderHandle, VoiceRecorderProps>(
    ({ isUploading, setIsUploading, onVoiceReadyChange, onRecordingChange, handleSendMessage }, ref) => {
        const { room } = useRoomContext();

        const [isRecording, setIsRecording] = useState(false);
        const [isVoiceReady, setIsVoiceReady] = useState(false);
        const [recordingSeconds, setRecordingSeconds] = useState(0);
        const [audioUrl, setAudioUrl] = useState<string | undefined>(undefined);
        const mediaRecorder = useRef<MediaRecorder | null>(null);
        const chunks = useRef<Blob[]>([]);
        const [isPlayingAudio, setIsPlayingAudio] = useState(false);
        const [audioDuration, setAudioDuration] = useState(0);
        const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);

        useEffect(() => {
            onVoiceReadyChange?.(isVoiceReady);
        }, [isVoiceReady, onVoiceReadyChange]);

        useEffect(() => {
            onRecordingChange?.(isRecording);
        }, [isRecording, onRecordingChange]);

        const startVoiceRecording = async (): Promise<void> => {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new window.MediaRecorder(stream);
            mediaRecorder.current.ondataavailable = (e) => chunks.current.push(e.data);
            mediaRecorder.current.onstart = (_) => setIsRecording(true)
            mediaRecorder.current.onstop = () => {
                const blob = new Blob(chunks.current, { type: "audio/webm" });
                setAudioUrl(URL.createObjectURL(blob));
                chunks.current = [];
                stream.getTracks().forEach((track) => track.stop());
            };
            mediaRecorder.current.start();
        };

        const stopVoiceRecording = async (): Promise<void> => {
            mediaRecorder.current && mediaRecorder.current.stop();
        };

        const sendVoiceRecording = async (): Promise<void> => {
            if (!audioUrl) return;
            if (!room || !room?.password) throw new Error(`Can't access room [${room?.id}] password.`);

            setIsUploading(true);
            try {
                const response = await fetch(audioUrl);
                const blob = await response.blob();
                const audioAsArrBuff = await blob.arrayBuffer();

                const key = await cryptoKeyFromRawExport(room.password);
                const { raw: iv, hex: ivHex } = getNewIV();

                const newFileId = ivHex + "_" + uuid();
                const msgInjected = MESSAGE_CODES.AUDIO.START + newFileId + MESSAGE_CODES.AUDIO.END;
                const encryptedBinary = await encryptSubtleClient(audioAsArrBuff, { iv, key });
                const res = await mutateUploadMedia(encryptedBinary, newFileId);
                if (res.success) {
                    setIsUploading(false)
                    const date = Date.now();
                    await saveImage({ id: newFileId, timestamp: date, blob: blob });
                    await deleteOld(MAX_IMAGES_IN_CACHED_INDEX_DB);
                    await handleSendMessage(msgInjected, date.toString());
                } else {
                    setIsUploading(false)
                    throw new Error("Failed to upload media");
                }
                setIsVoiceReady(false);
                setRecordingSeconds(0);
                setAudioDuration(0);
                setCurrentPlaybackTime(0);
                setIsPlayingAudio(false);
            } catch (e) {
                console.log("Error with uploading audio: ", e);
            }
            setIsUploading(false);
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

        const formatPlaybackTime = (current: number, total: number): string => {
            const formatTime = (time: number) => {
                if (!isFinite(time) || isNaN(time) || time < 0) {
                    return "00:00";
                }
                const minutes = Math.floor(time / 60);
                const seconds = Math.floor(time % 60);
                return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
            };
            
            if (!isFinite(total) || isNaN(total) || total <= 0) {
                return formatTime(current);
            }
            
            return `${formatTime(current)} / ${formatTime(total)}`;
        };

        useImperativeHandle(ref, () => ({
            isVoiceReady,
            sendVoiceRecording,
        }));

        const [micPermissionState, setMicPermissionState] = useState<PermissionState | null>(null);

        useEffect(() => {
            const checkMicPermission = async () => {
                try {
                    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                    setMicPermissionState(permission.state);
                    
                    permission.addEventListener('change', () => {
                        setMicPermissionState(permission.state);
                    });
                } catch (error) {
                    // Fallback for browsers that don't support permissions API
                    setMicPermissionState(null);
                }
            };

            checkMicPermission();
        }, []);

        const isMicDenied = micPermissionState === 'denied'

        return (
            <button
                className={`rounded-lg transition-all duration-300 flex items-center ${isMicDenied && 'cursor-not-allowed bg-red-900 hover:bg-red-900'} ${
                    isUploading
                        ? "bg-gray-600 text-gray-400 cursor-not-allowed p-2"
                        : isRecording
                            ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white pl-3 pr-4 py-3 flex-1 sm:w-64 shadow-lg shadow-red-500/25"
                            : isVoiceReady
                                ? "bg-gradient-to-r from-red-600 to-red-700 text-white pl-3 pr-4 py-3 flex-1 sm:w-64 cursor-default shadow-lg shadow-red-500/25"
                                : "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white p-2 hover:shadow-md transition-shadow"
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
                        setIsVoiceReady(false);
                        setAudioDuration(0);
                        setCurrentPlaybackTime(0);
                        setIsPlayingAudio(false);
                        await startVoiceRecording();
                    }
                }}
                disabled={isUploading || isMicDenied}
                aria-pressed={isRecording}
                aria-label={isRecording ? "Stop recording" : isVoiceReady ? "Voice recording ready" : "Start voice recording"}
                title={isRecording ? "Stop recording" : isVoiceReady ? "Voice recording ready" : "Start voice recording"}
            >
                {isRecording ? (
                    <div className="flex items-center gap-3 w-full justify-between recording-container">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center">
                                <div className="w-2 h-2 bg-white rounded-full recording-indicator mr-3"></div>
                            </div>
                            <div className="flex items-end gap-1" aria-hidden>
                                <span className="w-1 bg-white/90 recording-wave"></span>
                                <span className="w-1 bg-white/90 recording-wave"></span>
                                <span className="w-1 bg-white/90 recording-wave"></span>
                                <span className="w-1 bg-white/90 recording-wave"></span>
                                <span className="w-1 bg-white/90 recording-wave"></span>
                                <span className="w-1 bg-white/90 recording-wave"></span>
                                <span className="w-1 bg-white/90 recording-wave"></span>
                            </div>
                        </div>
                        <div className="text-sm font-mono tabular-nums font-medium">{formatDuration(recordingSeconds)}</div>
                        <div className="flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5 fill-white/90 hover:fill-white transition-colors"><rect x="7" y="7" width="10" height="10" rx="2"></rect></svg>
                        </div>
                    </div>
                ) : isVoiceReady ? (
                    <div className="flex items-center gap-3 w-full justify-between">
                        <div className="text-sm font-mono tabular-nums">
                            {isPlayingAudio && audioDuration > 0 && isFinite(audioDuration)
                                ? formatPlaybackTime(currentPlaybackTime, audioDuration)
                                : formatDuration(recordingSeconds)
                            }
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span
                                className="inline-flex p-1 rounded hover:bg-white/10 active:bg-white/20 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const audio = document.getElementById('voice-preview-audio') as HTMLAudioElement;
                                    if (audio.paused) {
                                        setIsPlayingAudio(true);
                                        audio.play();
                                    } else {
                                        setIsPlayingAudio(false);
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
                                onLoadedMetadata={(e) => {
                                    const audio = e.target as HTMLAudioElement;
                                    if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
                                        setAudioDuration(audio.duration);
                                    } else {
                                        setAudioDuration(recordingSeconds);
                                    }
                                }}
                                onLoadedData={(e) => {
                                    const audio = e.target as HTMLAudioElement;
                                    if (audioDuration === 0 || !isFinite(audioDuration)) {
                                        if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
                                            setAudioDuration(audio.duration);
                                        } else {
                                            setAudioDuration(recordingSeconds);
                                        }
                                    }
                                }}
                                onTimeUpdate={(e) => {
                                    const audio = e.target as HTMLAudioElement;
                                    setCurrentPlaybackTime(audio.currentTime);
                                }}
                                onEnded={() => {
                                    setIsPlayingAudio(false);
                                    setCurrentPlaybackTime(0);
                                }}
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-5 fill-white"><path d="M9 12.75 11.25 15 15 9.75"/></svg>
                            <span
                                className="inline-flex p-1 rounded hover:bg-white/10 active:bg-white/20 transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isUploading) return;
                                    setIsVoiceReady(false);
                                    setRecordingSeconds(0);
                                    setAudioDuration(0);
                                    setCurrentPlaybackTime(0);
                                    setIsPlayingAudio(false);
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
        );
    }
);

VoiceRecorder.displayName = "VoiceRecorder";

export default VoiceRecorder;


