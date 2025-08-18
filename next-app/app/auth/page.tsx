'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sign from '../components/Sign'
import { LOCAL_STORAGE_KEYS } from '../constants/localStorageKeys'
import { getFromStorage } from '../lib/localStorage'

export default function Auth() {
  const router = useRouter()
  useEffect(() => {
    const user = getFromStorage(LOCAL_STORAGE_KEYS.USER)
    if (user) {
      router.push('/chat')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Sign />
    </div>
  )
}
