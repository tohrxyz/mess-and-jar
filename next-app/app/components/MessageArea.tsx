import { Message } from "../types";

interface MessageAreaProps {
    messages: Message[];
    currentUsername: string;
}

export default function MessageArea({ messages, currentUsername }: MessageAreaProps) {
    return (
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
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