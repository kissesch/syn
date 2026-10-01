import type { RemoteVaultKeyEnvelope, VaultKeyBinding } from "./types";
export declare class VaultPasswordError extends Error {
    readonly code: "required" | "outer_spaces";
    constructor(code: "required" | "outer_spaces", message: string);
}
export interface PasswordWrapperOptions {
    binding?: VaultKeyBinding;
    kdfOverrides?: Partial<{
        memoryKiB: number;
        iterations: number;
        parallelism: number;
    }>;
}
export interface CreatePasswordWrapperResult {
    envelope: RemoteVaultKeyEnvelope;
    remoteVaultKey: Uint8Array;
}
export declare function createPasswordWrappedRemoteVaultKey(password: string, options?: PasswordWrapperOptions): Promise<CreatePasswordWrapperResult>;
/** Rewrap an existing data key; a password change must never generate a new one. */
export declare function wrapRemoteVaultKeyWithPassword(password: string, remoteVaultKey: Uint8Array, options?: PasswordWrapperOptions): Promise<RemoteVaultKeyEnvelope>;
export declare function unwrapRemoteVaultKeyWithPassword(password: string, envelope: RemoteVaultKeyEnvelope, expectedBinding?: VaultKeyBinding): Promise<Uint8Array>;
