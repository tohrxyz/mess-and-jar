export type User = {
  username: string
  password: string
  identityKeypairHex: {
    publicKeyHex: string
    privateKeyHex: string
  }
}
