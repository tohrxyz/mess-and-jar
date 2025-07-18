import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import Sidebar from "../components/Sidebar";

export default function ChatLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen bg-gray-900">
            <div className="flex-1 flex flex-col min-w-0 h-full w-full lg:hidden">
                <div className="flex-1 min-h-0 h-full w-full">
                    {children}
                </div>
            </div>

            <div className="hidden lg:flex w-full h-full">
                <ResizablePanelGroup direction="horizontal">
                    <ResizablePanel 
                        defaultSize={25} 
                        minSize={15} 
                        maxSize={28}
                        id="sidebar"
                    >
                        <Sidebar />
                    </ResizablePanel>
                    <ResizableHandle 
                        className="w-1 bg-gray-700 hover:bg-gray-600 transition-colors"
                    />
                    <ResizablePanel 
                        defaultSize={75} 
                        minSize={60}
                        id="main-content"
                    >
                        <div className="flex-1 flex flex-col min-w-0 h-full w-full">
                            <div className="flex-1 min-h-0 h-full w-full">
                                {children}
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    );
}
