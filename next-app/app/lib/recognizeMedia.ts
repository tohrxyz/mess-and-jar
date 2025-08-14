import { MESSAGE_CODES } from "../constants/messageCodes"

export const getMediaTypeFromMessage = (message: string) => {
    let type: "photo" | "video" | null = null
    if (message.startsWith(MESSAGE_CODES.PHOTO.START) && message.endsWith(MESSAGE_CODES.PHOTO.END)) {
        type = "photo"
    } else if (message.startsWith(MESSAGE_CODES.VIDEO.START) && message.endsWith(MESSAGE_CODES.VIDEO.END)) {
        type = "video"
    }
    return type
}