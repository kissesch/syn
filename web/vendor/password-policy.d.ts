export type VaultPasswordValidation = {
    ok: true;
} | {
    ok: false;
    code: "required" | "outer_spaces" | "min_length" | "max_length" | "too_weak" | "repeated_character" | "simple_sequence";
    count?: number;
    message: string;
};
export declare function validateVaultPassword(password: string): VaultPasswordValidation;
