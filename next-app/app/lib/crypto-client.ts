import { AES, enc, SHA256, lib } from "crypto-js"

export const getHashClient = (input: string) => {
    return SHA256(input).toString();
}

enum CiphertextAlgorithm {
    Message = "AES-GCM"
}

export async function generateKeySubtleClient() {
    const key =  await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    )

    const exportedKey = await crypto.subtle.exportKey('raw', key)

    return {
        key,
        rawKey: exportedKey
    }
}

export async function cryptoKeyFromRawExport(rawKeyHex: string) {
    const arrBuff = hexToArrayBuffer(rawKeyHex)
    return await crypto.subtle.importKey('raw', arrBuff, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function hashSubtleClient(input: string | ArrayBuffer, rounds: number = 1): Promise<ArrayBuffer> {
    let data: BufferSource
    
    if (typeof input === "string") {
        data = new TextEncoder().encode(input)
    } else {
        data = input
    }
    
    let hash = await crypto.subtle.digest('SHA-256', data)
    
    for (let i = 1; i < rounds; i++) {
        hash = await crypto.subtle.digest('SHA-256', hash)
    }
    
    return hash
}

export async function hashSubtleClientHex(input: string | ArrayBuffer, rounds: number = 1): Promise<string> {
    const hash = await hashSubtleClient(input, rounds)
    return arrayBufferToHex(hash)
}


export const getNewIV = () => {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const hex = arrayBufferToHex(iv.buffer)

    return { raw: iv, hex }
}

export async function encryptSubtleClient(input: ArrayBuffer | string, keys: {
    iv: Uint8Array,
    key: CryptoKey
}) {
    let data: BufferSource

    if (typeof input === "string") {
        data = new TextEncoder().encode(input)
    } else {
        data = input
    }
    return await crypto.subtle.encrypt({ 
        name: CiphertextAlgorithm.Message,
        iv: keys.iv,
        tagLength: 128
    }, keys.key, data)
}

export const arrayBufferToHex = (buffer: ArrayBuffer): string => {
    return Array.from(new Uint8Array(buffer))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}

export const hexToArrayBuffer = (hex: string): ArrayBuffer => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes.buffer;
}


export async function decryptSubtleClient(encrypted: string | ArrayBuffer, keys: {
    iv: Uint8Array,
    key: CryptoKey
}) {
    let data: ArrayBuffer
    if (typeof encrypted === "string") {
        data = hexToArrayBuffer(encrypted)
    } else {
        data = encrypted
    }

    return await crypto.subtle.decrypt(
        { name: CiphertextAlgorithm.Message, iv: keys.iv, tagLength: 128 },
        keys.key,
        data
    )
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
