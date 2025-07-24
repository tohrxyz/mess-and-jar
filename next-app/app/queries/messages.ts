import { useQuery } from "@tanstack/react-query";
import { Message } from "../types";

export const getMessages = async (roomId: string, timestamp: number | null): Promise<Message[]> => {
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

export const useMessages = (roomId: string, timestamp: number | null) => {
    return useQuery({
        queryKey: ["messages", roomId, timestamp],
        queryFn: () => getMessages(roomId, timestamp),
        enabled: Boolean(roomId && timestamp !== null),
        refetchInterval: 31000,
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: false,
        retry: 3,
    })
}