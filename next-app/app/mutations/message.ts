import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { getHashClient } from "../lib/crypto-client";
import { getFromStorage } from "../lib/localStorage";

export type SendMessageResponse = {
    success: boolean;
    message: string;
}

export const mutateSendMessage = async (room: string, username: string, msg: string, date: string): Promise<SendMessageResponse> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
    const user = getFromStorage(LOCAL_STORAGE_KEYS.USER);
    const userObj = JSON.parse(user);
    const formData = new FormData();
    formData.append("room", room);
    formData.append("username", username);
    formData.append("msg", msg);
    formData.append("date", date);
    formData.append("password", getHashClient(userObj.password));
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

export type UploadMediaResponse = {
    success: boolean;
    message: string;
}

export const mutateUploadMedia = async (
    binaryData: ArrayBuffer,
    file_id: string
): Promise<UploadMediaResponse> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
    
    const response = await fetch(`${apiUrl}/upload_media?file_id=${file_id}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/octet-stream',
        },
        body: binaryData,
    });
    
    if (!response.ok) {
        return {
            success: false,
            message: "Failed to upload media",
        };
    }
    
    return {
        success: true,
        message: "Media uploaded successfully",
    };
};

export type DownloadMediaResponse = {
    success: boolean;
    data: ArrayBuffer | null;
    message: string;
}

export const mutateDownloadMedia = async (
    file_id: string
): Promise<DownloadMediaResponse> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL;
    
    const response = await fetch(`${apiUrl}/download_media?file_id=${file_id}`, {
        method: "GET",
    });
    
    if (!response.ok) {
        return {
            success: false,
            data: null,
            message: "Failed to download media",
        };
    }
    
    const binaryData = await response.arrayBuffer();
    
    return {
        success: true,
        data: binaryData,
        message: "Media downloaded successfully",
    };
};
