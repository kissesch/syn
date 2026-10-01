export type KeyTransferContext = {
    requestId: string;
    vaultId: string;
    userId: string;
    accessVersion: number;
};
export type KeyTransferEnvelope = {
    version: 1;
    algorithm: "rsa-oaep-sha256";
    ciphertext: string;
};
/** Request-scoped receiver keys. The private key never leaves the receiving device. */
export declare function createKeyTransferReceiver(): Promise<{
    publicKey: string;
    privateKey: string;
}>;
export declare function validateKeyTransferPublicKey(publicKey: string): Promise<void>;
/** Compare this full code with the recipient through a separate trusted channel. */
export declare function keyTransferVerificationCode(publicKey: string, context: KeyTransferContext): Promise<string>;
export declare function encryptVaultKeyForReceiver(key: Uint8Array, publicKey: string, context: KeyTransferContext): Promise<KeyTransferEnvelope>;
export declare function decryptTransferredVaultKey(envelope: KeyTransferEnvelope, privateKey: string, context: KeyTransferContext): Promise<Uint8Array>;
