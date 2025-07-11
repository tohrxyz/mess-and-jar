import { RefObject } from "react";

export const scrollToBottom = (messageAreaScrollRef: RefObject<HTMLDivElement | null>) => {
    if (!messageAreaScrollRef.current) return;
    setTimeout(() => {
        messageAreaScrollRef.current?.scrollTo({
            top: messageAreaScrollRef.current?.scrollHeight + 200,
            behavior: "smooth"
        });
    }, 200);
}