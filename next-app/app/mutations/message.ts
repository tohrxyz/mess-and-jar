export type SendMessageResponse = {
    success: boolean;
    message: string;
}

export const mutateSendMessage = async (room: string, username: string, msg: string, date: string): Promise<SendMessageResponse> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
    const formData = new FormData();
    formData.append("room", room);
    formData.append("username", username);
    formData.append("msg", msg);
    formData.append("date", date);
    const response = await fetch(`${apiUrl}/send_message`, {
        method: "POST",
        body: formData,
    });
    if (!response.ok) {
        return {
            success: false,
            message: "Failed to send message",
        };
    }
    return {
        success: true,
        message: "Message sent successfully",
    };
};