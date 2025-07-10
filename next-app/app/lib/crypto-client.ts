import { AES, enc, SHA256 } from "crypto-js"

export const getHashClient = (input: string) => {
    return SHA256(input).toString();
}

export const encryptStringClient = (input: string, key: string) => {
    return AES.encrypt(input, key).toString();
}

export const decryptStringClient = (input: string, key: string) => {
    try {
        return AES.decrypt(input, key).toString(enc.Utf8);
    } catch (error) {
        return null;
    }
}