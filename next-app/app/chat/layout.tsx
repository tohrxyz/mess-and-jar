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
            <div className="flex-1 flex flex-col">
                <div className="flex-1 bg-gray-100">
                    {children}
                </div>
            </div>
        </div>
    );
}
