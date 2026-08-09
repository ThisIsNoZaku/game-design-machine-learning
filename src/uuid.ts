export function v4(): string {
    // Generate a random UUID (version 4)
    return crypto.randomUUID();
}