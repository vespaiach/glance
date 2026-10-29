export type ApiKey = { tail: string; createdAt: string; lastUsedAt: string | null };

export type NewApiKey = ApiKey & { key: string };
