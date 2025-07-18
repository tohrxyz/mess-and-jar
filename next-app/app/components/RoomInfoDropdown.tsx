"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Room } from "@/app/types";

interface RoomInfoDropdownProps {
    room: Room;
}

export default function RoomInfoDropdown({ room }: RoomInfoDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, width: 0 });
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Update button position when opening dropdown
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setButtonPosition({
                top: rect.bottom + window.scrollY,
                left: rect.right + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setShowPassword(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleCopy = async (value: string, fieldName: string) => {
        if (!value) return;
        
        try {
            await navigator.clipboard.writeText(value);
            setCopiedField(fieldName);
            setTimeout(() => setCopiedField(null), 2000);
        } catch (err) {
            console.error(`Failed to copy ${fieldName}:`, err);
        }
    };

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    const displayPassword = showPassword ? room.password : '•'.repeat(16);

    const dropdownContent = isOpen && (
        <div 
            ref={dropdownRef}
            className="fixed w-64 sm:w-auto sm:min-w-[280px] max-w-[320px] z-[9999] bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4"
            style={{
                top: `${buttonPosition.top + 8}px`,
                left: `${Math.max(16, Math.min(buttonPosition.left - 280, window.innerWidth - 320))}px`
            }}
        >
            <div className="space-y-4">
                <div className="border-b border-gray-600 pb-2">
                    <h3 className="text-lg font-semibold text-white">Room Configuration</h3>
                </div>

                {/* Room ID */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">ID</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 text-sm text-gray-100 bg-gray-700 p-2 rounded font-mono break-all">
                            {room.id}
                        </div>
                        <button
                            onClick={() => handleCopy(room.id, 'id')}
                            className="text-gray-400 hover:text-white transition-colors p-1 rounded flex-shrink-0"
                            title="Copy ID"
                        >
                            {copiedField === 'id' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Room Name */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Name</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 text-sm text-gray-100 bg-gray-700 p-2 rounded break-words">
                            {room.name}
                        </div>
                        <button
                            onClick={() => handleCopy(room.name, 'name')}
                            className="text-gray-400 hover:text-white transition-colors p-1 rounded flex-shrink-0"
                            title="Copy name"
                        >
                            {copiedField === 'name' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>

                {/* Room Password */}
                <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Password</label>
                    <div className="flex items-center gap-2">
                        <div className="flex-1 text-sm text-gray-100 bg-gray-700 p-2 rounded font-mono break-all">
                            {displayPassword}
                        </div>
                        
                        {/* Show/Hide toggle */}
                        <button
                            onClick={togglePassword}
                            className="text-gray-400 hover:text-white transition-colors p-1 rounded flex-shrink-0"
                            title={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 1-4.243-4.243m4.242 4.242L9.88 9.88" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                </svg>
                            )}
                        </button>

                        {/* Copy button */}
                        <button
                            onClick={() => handleCopy(room.password, 'password')}
                            className="text-gray-400 hover:text-white transition-colors p-1 rounded flex-shrink-0"
                            title="Copy password"
                        >
                            {copiedField === 'password' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-400">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-gray-700"
                title="Room info"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                    />
                </svg>
            </button>
            
            {/* Portal for dropdown content */}
            {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
        </>
    );
} 