import { AES, enc, SHA256, lib } from "crypto-js"

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

export const encryptBinaryClient = (input: ArrayBuffer, key: string) => {
    try {
        // Convert ArrayBuffer to WordArray
        const wordArray = lib.WordArray.create(input);
        return AES.encrypt(wordArray, key).toString();
    } catch (error) {
        return null;
    }
}

export const decryptBinaryClient = (input: string, key: string): ArrayBuffer | null => {
    try {
        const decrypted = AES.decrypt(input, key);
        // Convert WordArray back to ArrayBuffer
        const typedArray = new Uint8Array(decrypted.sigBytes);
        for (let i = 0; i < decrypted.sigBytes; i++) {
            typedArray[i] = (decrypted.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        return typedArray.buffer;
    } catch (error) {
        return null;
    }
}
