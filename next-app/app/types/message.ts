export type Message = {
    date: string;
    room: string;
    username: string;
    msg: string;
    isSentFromClient?: boolean;
    identityPubkey?: string;
    signature?: string;
    isSignatureValid?: boolean
}