export class EnvironmentConfigError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(`Missing required environment variables: ${missing.join(", ")}`);
    this.name = "EnvironmentConfigError";
    this.missing = missing;
  }
}

export function assertRequiredEnv(names: readonly string[]): void {
  const missing = names.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw new EnvironmentConfigError(missing);
  }
}

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new EnvironmentConfigError([name]);
  }
  return value;
}

export const CORE_SERVER_ENV = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
] as const;
