import type { RemoteVaultKeyDerivationMetadata } from "./types";
type Argon2idParams = Pick<RemoteVaultKeyDerivationMetadata, "memoryKiB" | "iterations" | "parallelism">;
type Argon2idParamOverrides = Partial<Argon2idParams>;
export declare function createArgon2idMetadata(overrides?: Argon2idParamOverrides): RemoteVaultKeyDerivationMetadata;
export declare function deriveWrapKey(password: string, metadata: RemoteVaultKeyDerivationMetadata): Promise<CryptoKey>;
export {};
