import { LOCAL_STORAGE_KEYS } from '../constants/localStorageKeys'
import { getHashClient } from '../lib/crypto-client'
import { getFromStorage } from '../lib/localStorage'

export type SendMessageResponse = {
  success: boolean
  message: string
}

export const mutateSendMessage = async (
  room: string,
  username: string,
  msg: string,
  date: string,
  signature: string,
): Promise<SendMessageResponse> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL
  const user = getFromStorage(LOCAL_STORAGE_KEYS.USER)
  const userObj = JSON.parse(user)
  const formData = new FormData()
  formData.append('room', room)
  formData.append('username', username)
  formData.append('msg', msg)
  formData.append('date', date)
  formData.append('password', getHashClient(userObj.password))
  formData.append('signature', signature)
  const response = await fetch(`${apiUrl}/send_message`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    return {
      success: false,
      message: 'Failed to send message',
    }
  }
  return {
    success: true,
    message: 'Message sent successfully',
  }
}

export type UploadMediaResponse = {
  success: boolean
  message: string
}

export const mutateUploadMedia = async (binaryData: ArrayBuffer, file_id: string): Promise<UploadMediaResponse> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL

  // 1. Get presigned upload URL from backend
  const formData = new FormData()
  formData.append('filename', file_id)
  formData.append('content_type', 'application/octet-stream')

  const urlResponse = await fetch(`${apiUrl}/get_upload_url`, {
    method: 'POST',
    body: formData,
  })

  if (!urlResponse.ok) {
    return {
      success: false,
      message: 'Failed to get upload URL',
    }
  }

  const { upload_url } = await urlResponse.json()

  // 2. Upload directly to R2
  const uploadResponse = await fetch(upload_url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/octet-stream',
    },
    body: binaryData,
  })

  if (!uploadResponse.ok) {
    return {
      success: false,
      message: 'Failed to upload media to R2',
    }
  }

  return {
    success: true,
    message: 'Media uploaded successfully',
  }
}

export type DownloadMediaResponse = {
  success: boolean
  data: ArrayBuffer | null
  message: string
}

export const mutateDownloadMedia = async (file_id: string): Promise<DownloadMediaResponse> => {
  const r2Url = process.env.NEXT_PUBLIC_R2_PUBLIC_URL

  const response = await fetch(`${r2Url}/${file_id}`, {
    method: 'GET',
  })

  if (!response.ok) {
    return {
      success: false,
      data: null,
      message: 'Failed to download media',
    }
  }

  const binaryData = await response.arrayBuffer()

  return {
    success: true,
    data: binaryData,
    message: 'Media downloaded successfully',
  }
}
