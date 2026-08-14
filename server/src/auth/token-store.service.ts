import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface GoogleConnection {
  email: string;
  accessToken: string;
  refreshToken: string;
  expiryDate: number; // ms epoch
  scopes: string[];
}

// Only one Google identity is ever meaningfully connected here (tech@netstripes.com,
// authorized once via the login gate — see AuthService). Persisting it as a single
// JSON file avoids pulling in a full database for one row, while still surviving
// backend restarts on the VPS. If this ever needs to support multiple connected
// accounts, swap this file for a real table without touching any of its callers.
@Injectable()
export class TokenStoreService {
  private readonly filePath = join(__dirname, '..', '..', 'data', 'google-connection.json');
  private cache: GoogleConnection | null = null;

  constructor() {
    const dir = join(__dirname, '..', '..', 'data');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (existsSync(this.filePath)) {
      try {
        this.cache = JSON.parse(readFileSync(this.filePath, 'utf8'));
      } catch {
        this.cache = null;
      }
    }
  }

  get(): GoogleConnection | null {
    return this.cache;
  }

  save(connection: GoogleConnection): void {
    this.cache = connection;
    writeFileSync(this.filePath, JSON.stringify(connection, null, 2), 'utf8');
  }

  clear(): void {
    this.cache = null;
    if (existsSync(this.filePath)) writeFileSync(this.filePath, '', 'utf8');
  }
}
