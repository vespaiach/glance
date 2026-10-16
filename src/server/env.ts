import "server-only";
import * as v from "valibot";

const POSTGRES_URL = /^postgres(ql)?:\/\//;

const EnvSchema = v.object({
  DATABASE_URL: v.pipe(v.string(), v.trim(), v.regex(POSTGRES_URL)),
  DATA_DIR: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  APP_URL: v.pipe(v.string(), v.url()),
  RESEND_API_KEY: v.pipe(v.string(), v.trim(), v.nonEmpty()),
  MAIL_FROM: v.pipe(v.string(), v.trim(), v.nonEmpty()),
});

export type Env = v.InferOutput<typeof EnvSchema>;

let cached: Env | undefined;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = v.safeParse(EnvSchema, source);

  if (!result.success) {
    throw new Error(`Invalid server config: ${invalidKeys(result.issues).join(", ")}`);
  }

  return result.output;
}

export function env(): Env {
  cached ??= parseEnv(process.env);

  return cached;
}

function invalidKeys(issues: v.GenericIssue[]): string[] {
  const keys = issues.map((issue) => v.getDotPath(issue) ?? "");

  return [...new Set(keys)];
}
