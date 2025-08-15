import { MESSAGE_CODES } from "../constants/messageCodes"

export const getMediaTypeFromMessage = (message: string) => {
    let type: "photo" | "video" | "audio" | null = null
    if (message.startsWith(MESSAGE_CODES.PHOTO.START) && message.endsWith(MESSAGE_CODES.PHOTO.END)) {
        type = "photo"
    } else if (message.startsWith(MESSAGE_CODES.VIDEO.START) && message.endsWith(MESSAGE_CODES.VIDEO.END)) {
        type = "video"
    } else if (message.startsWith(MESSAGE_CODES.AUDIO.START) && message.endsWith(MESSAGE_CODES.AUDIO.END)) {
        type = "audio"
    }
    return type
}