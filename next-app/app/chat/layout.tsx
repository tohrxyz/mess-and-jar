import Sidebar from "../components/Sidebar";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-900">
            <div className="flex">
                <Sidebar />
            </div>
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 min-h-0">
                    {children}
                </div>
            </div>
        </div>
    );
}
