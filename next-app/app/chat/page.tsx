"use client";
import { getFromStorage } from "../lib/localStorage";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";

export default function Chat() {
    const router = useRouter();
    const [user, setUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const userData = getFromStorage(LOCAL_STORAGE_KEYS.USER);
        if (!userData) {
            router.push("/auth");
        } else {
            setUser(userData);
        }
        setIsLoading(false);
    }, [router]);


    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return null
    }

    return <EmptyState />
}