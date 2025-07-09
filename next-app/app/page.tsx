"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "./constants/localStorageKeys";
import { getFromStorage } from "./lib/localStorage";

export default function Home() {
    const router = useRouter();
    
    useEffect(() => {
        const user = getFromStorage(LOCAL_STORAGE_KEYS.USER);
        if (user) {
            router.push("/chat");
        } else {
            router.push("/auth");
        }
    }, [router]);

    return null;
}
