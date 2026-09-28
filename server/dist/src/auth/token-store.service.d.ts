export interface GoogleConnection {
    email: string;
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    scopes: string[];
}
export declare class TokenStoreService {
    private readonly filePath;
    private cache;
    constructor();
    get(): GoogleConnection | null;
    save(connection: GoogleConnection): void;
    clear(): void;
}
