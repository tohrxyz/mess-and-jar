import { useQuery } from "@tanstack/react-query";
import { Message } from "../types";

export const getMessages = async (roomId: string, timestamp: number): Promise<Message[]> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
    const response = await fetch(`${apiUrl}/query_messages?room=${roomId}&timestamp=${timestamp}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const data = await response.json() as Message[];
    return data;
}

export const useMessages = (roomId: string, timestamp: number) => {
    return useQuery({
        queryKey: ["messages", roomId, timestamp],
        queryFn: () => getMessages(roomId, timestamp),
        enabled: !!roomId,
        refetchInterval: 5000,
        refetchOnWindowFocus: true,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 3,
    })
}