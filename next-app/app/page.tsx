"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LOCAL_STORAGE_KEYS } from "./constants/localStorageKeys";
import { clearStorage, getFromStorage, saveToStorage } from "./lib/localStorage";

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

    useEffect(() => {
        const wasNukedDueToMigration: string | null = getFromStorage(LOCAL_STORAGE_KEYS.WAS_DB_MIGRATED_JSON_SQLITE_V1)
        if (wasNukedDueToMigration === null) {
            const currentStoredRooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS)
            saveToStorage(LOCAL_STORAGE_KEYS.BACKUP_WAS_DB_MIGRATED_JSON_SQLITE_V1, currentStoredRooms)
            clearStorage(LOCAL_STORAGE_KEYS.ROOMS)
            saveToStorage(LOCAL_STORAGE_KEYS.WAS_DB_MIGRATED_JSON_SQLITE_V1, "true")
            window.location.reload()
        }
    }, [])

    return null;
}
