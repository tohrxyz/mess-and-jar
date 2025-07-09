"use client";
import { clearStorage, getFromStorage } from "../lib/localStorage";
import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Chat() {
    const router = useRouter();
    const [user, setUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleLogout = () => {
        clearStorage(LOCAL_STORAGE_KEYS.USER);
        router.push("/auth");
    }

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

    return (
        <div>
            <h1>Chat</h1>
            <p>Username: {JSON.parse(user).username}</p>
            <p>Password: {JSON.parse(user).password}</p>
            <button onClick={handleLogout}>Logout</button>
        </div>
    )
}