import { ReactNode } from "react"

export const HomepageLayout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="flex flex-col items-center justify-center min-h-[100vh]">
      { children }
    </main>
  )
}

export const ChatMenuLayout = ({ children }: { children: ReactNode }) => {
  return (
    <section className="bg-gray-400">
      { children }
    </section>
  )
}