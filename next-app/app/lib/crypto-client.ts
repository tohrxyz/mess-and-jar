import { AES, enc, SHA256, lib } from "crypto-js"

export const getHashClient = (input: string) => {
    return SHA256(input).toString();
}

enum CiphertextAlgorithm {
    Message = "AES-GCM",
    Identity = 'Ed25519'
}

export async function generateKeySubtleClient() {
    const key =  await crypto.subtle.generateKey(
        { name: CiphertextAlgorithm.Message, length: 256 },
        true,
        ['encrypt', 'decrypt']
    )

    const exportedKey = await crypto.subtle.exportKey('raw', key)

    return {
        key,
        rawKey: exportedKey
    }
}

export async function generateNewIdentityKeyPair() {
    return await crypto.subtle.generateKey(
        { name: CiphertextAlgorithm.Identity },
        true, //consider non-extractable & saving to indexdb as opaque key (prevents xss etc..)
        ['sign', 'verify']
    )
}

type Hex = string

export async function getKeyPairToHex(keyPair: CryptoKeyPair) {
    const privKey = keyPair.privateKey
    const pubKey = keyPair.publicKey

    const [privKeyHex, pubKeyHex] = await Promise.all([
        crypto.subtle.exportKey('pkcs8', privKey).then(raw => arrayBufferToHex(raw)),
        crypto.subtle.exportKey('spki', pubKey).then(raw => arrayBufferToHex(raw)),
    ])
    return {
        privateKeyHex: privKeyHex as Hex,
        publicKeyHex: pubKeyHex as Hex
    }
}

/*
    wrapper around generateNewIdentityKeyPair() and getKeyPairToHex()
*/
export async function getNewIdentityAsHex() {
    return (await getKeyPairToHex((await generateNewIdentityKeyPair())))
}

export async function getIdentityKeyPairFromHex({ privateKeyHex, publicKeyHex }: { privateKeyHex: Hex, publicKeyHex: Hex }) {
    const privKeyAsBuffer = hexToArrayBuffer(privateKeyHex)
    const pubKeyAsBuffer = hexToArrayBuffer(publicKeyHex)
    const [privKey, pubKey] = await Promise.all([
        crypto.subtle.importKey('pkcs8', privKeyAsBuffer, CiphertextAlgorithm.Identity, true, ['sign']),
        crypto.subtle.importKey('spki', pubKeyAsBuffer, CiphertextAlgorithm.Identity, true, ['verify'])
    ])

    return {
        privateKey: privKey,
        publicKey: pubKey
    } as CryptoKeyPair
}

export async function signMessage({ messageBuffer, privateKeyHex }: { messageBuffer: ArrayBuffer, privateKeyHex: Hex }) {
    const privKeyAsBuffer = hexToArrayBuffer(privateKeyHex)
    const privKey = await crypto.subtle.importKey('pkcs8', privKeyAsBuffer, CiphertextAlgorithm.Identity, true, ['sign'])

    const signature =  await crypto.subtle.sign(CiphertextAlgorithm.Identity, privKey, messageBuffer) 
    const sigAsHex = arrayBufferToHex(signature)
    return {
        signatureRaw: signature,
        signatureHex: sigAsHex
    }
}

export async function verifyMessageAgainstPubkeyHex({ messageBuffer, signature, publicKeyHex }: { messageBuffer: ArrayBuffer, signature: string,  publicKeyHex: Hex }) {
    if (!signature || !publicKeyHex || signature === "" || publicKeyHex === "") return false
    
    try {
        const pubKeyAsBuffer = hexToArrayBuffer(publicKeyHex);
        const pubkey = await crypto.subtle.importKey("spki", pubKeyAsBuffer, CiphertextAlgorithm.Identity, true, ['verify'])
        const sigAsBuffer = hexToArrayBuffer(signature)
        return await crypto.subtle.verify(CiphertextAlgorithm.Identity, pubkey, sigAsBuffer, messageBuffer)
    } catch(e) {
        console.error("Error with verifying signature: ", e)
        return false
    }
}

export const prepareBufferFromMessage = async (
    { date, room, username, msg}: {
        date: string,
        room: string,
        username: string,
        msg: string
    }
) => {
    const sortedKeys = ['date', 'room', 'username', 'msg'];
    const orderedObj: Record<string, string> = {};
    
    sortedKeys.forEach(key => {
        switch(key) {
            case 'date':
                orderedObj[key] = date;
                break;
            case 'room':
                orderedObj[key] = room;
                break;
            case 'username':
                orderedObj[key] = username;
                break;
            case 'msg':
                orderedObj[key] = msg;
                break;
        }
    });
    
    const blob = new Blob([JSON.stringify(orderedObj)]);
    return await blob.arrayBuffer();
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
