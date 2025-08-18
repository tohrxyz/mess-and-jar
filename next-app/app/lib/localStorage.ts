import { LOCAL_STORAGE_KEYS } from '../constants/localStorageKeys'

export const saveToStorage = (key: string, value: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

export const getFromStorage = (key: string) => {
  if (typeof window !== 'undefined') {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) : null
  }
  return null
}

export const clearStorage = (key: string) => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key)
  }
}

export const exportLocalConfig = () => {
  if (typeof window === 'undefined') {
    return null
  }
  const user = getFromStorage(LOCAL_STORAGE_KEYS.USER)
  const rooms = getFromStorage(LOCAL_STORAGE_KEYS.ROOMS)
  const config = {
    user,
    rooms,
  }
  const a = document.createElement('a')
  a.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config))
  a.download = 'mess-and-jar-local-config.json'
  a.click()
}

export const importLocalConfig = (config: any) => {
  if (typeof window === 'undefined') {
    return null
  }
  saveToStorage(LOCAL_STORAGE_KEYS.USER, config.user)
  saveToStorage(LOCAL_STORAGE_KEYS.ROOMS, config.rooms)
}
