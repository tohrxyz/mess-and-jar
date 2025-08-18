import { getUserFromStorage } from '../lib/get-user-util'
import { RoomBackendMethod, RoomCreateOrEditResponse, RoomGetResponse, RoomParams } from '../types'

export const roomOperation = async ({
  id,
  name,
  password,
  method,
}: RoomParams): Promise<RoomCreateOrEditResponse | RoomGetResponse> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL
  const user = getUserFromStorage()
  if (!user || !user?.password || !user?.username) throw new Error("Can't get local user config")

  const formData = new FormData()
  const urlEncodedName = encodeURIComponent(name || '')
  formData.append('id', id)
  formData.append('name', urlEncodedName)
  formData.append('password', password || '')
  formData.append('method', method)

  const response = await fetch(`${apiUrl}/room`, {
    method: 'POST',
    body: `id=${id}&name=${name}&password=${password}&method=${method}`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  if (!response.ok) {
    return {
      success: false,
      message: response.statusText,
    }
  }

  if (method === RoomBackendMethod.RoomGet) {
    const roomData = await response.json()
    return {
      success: true,
      message: 'Room retrieved successfully',
      room: {
        ...roomData,
        name: decodeURIComponent(roomData.name),
      },
    }
  }

  return {
    success: true,
    message: 'Room operation completed successfully',
  }
}
