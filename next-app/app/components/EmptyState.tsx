export default function EmptyState() {
    return (
        <div className="flex flex-col h-screen bg-gray-900">
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-700 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-white mb-2">
                        Welcome to Chat
                    </h2>
                    <p className="text-gray-400 mb-6">
                        Select a room from the sidebar to start chatting
                    </p>
                    <div className="text-sm text-gray-500">
                        Create a new room or join an existing one to get started
                    </div>
                </div>
            </div>
        </div>
    );
} 