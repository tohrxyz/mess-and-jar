import { Message } from "../types";

export const getMessages = async (roomId: string, timestamp: number): Promise<Message[]> => {
    console.log("getMessages", roomId, timestamp);
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