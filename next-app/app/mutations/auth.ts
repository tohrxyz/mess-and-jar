export type AuthResponse = {
  success: boolean
  message: string
}

export const mutateAuth = async (
  username: string,
  password: string,
  identity_pubkey: string,
): Promise<AuthResponse> => {
  const apiUrl = process.env.NEXT_PUBLIC_API_BACKEND_URL
  const response = await fetch(`${apiUrl}/auth`, {
    method: 'POST',
    body: `username=${username}&password=${password}&identity_pubkey=${identity_pubkey}`,
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

  const body = await response.json()
  console.log({ body })
  return {
    success: body.status,
    message: body.message ?? body.error,
  }
}
