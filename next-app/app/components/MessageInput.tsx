interface MessageInputProps {
    message: string;
    setMessage: (message: string) => void;
    onSendMessage: (message: string) => void;
}

export default function MessageInput({ message, setMessage, onSendMessage }: MessageInputProps) {

    const handleOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && message.trim().length > 0) {
            onSendMessage(message);
        }
    }

    return (
        <div className="bg-gray-800 border-t border-gray-700 px-6 py-2 flex-shrink-0">
            <div className="flex space-x-4">
                <input
                    type="text"
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleOnKeyDown}
                />
                <button 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200" 
                    onClick={() => onSendMessage(message)}
                    disabled={message.length === 0}
                >
                    Send
                </button>
            </div>
        </div>
    );
} 