import { RoomProvider } from './RoomContext'

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full bg-gray-900">
      <RoomProvider>{children}</RoomProvider>
    </div>
  )
}
