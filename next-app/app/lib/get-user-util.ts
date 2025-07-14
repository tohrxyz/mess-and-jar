import { LOCAL_STORAGE_KEYS } from "../constants/localStorageKeys"
import { User } from "../types"
import { getFromStorage } from "./localStorage"

export const getUserFromStorage = () => {
    const user = getFromStorage(LOCAL_STORAGE_KEYS.USER)
    const userJson = JSON.parse(user) as User | null
    return userJson
}