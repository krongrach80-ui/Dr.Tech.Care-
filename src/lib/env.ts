import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL ต้องเป็น URL ที่ถูกต้อง")
    .default("http://127.0.0.1:54321"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY ห้ามว่าง")
    .default("anon-key-placeholder-for-local-dev-mode-32chars"),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY ห้ามว่าง")
    .optional(),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  TRUSTED_PROXY_HOPS: z.coerce.number().int().nonnegative().default(1),
  CANDIDATE_TOKEN_SECRET: z
    .string()
    .min(32, "CANDIDATE_TOKEN_SECRET ต้องมีความยาวอย่างน้อย 32 ตัวอักษร")
    .default("dev-candidate-token-secret-dr-tech-care-32-chars-long"),
  BOOTSTRAP_DIRECTOR_USERNAME: z.string().optional(),
  BOOTSTRAP_DIRECTOR_PASSWORD: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse({
    NODE_ENV: process.env["NODE_ENV"],
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    APP_ORIGIN: process.env["APP_ORIGIN"],
    TRUSTED_PROXY_HOPS: process.env["TRUSTED_PROXY_HOPS"],
    CANDIDATE_TOKEN_SECRET: process.env["CANDIDATE_TOKEN_SECRET"],
    BOOTSTRAP_DIRECTOR_USERNAME: process.env["BOOTSTRAP_DIRECTOR_USERNAME"],
    BOOTSTRAP_DIRECTOR_PASSWORD: process.env["BOOTSTRAP_DIRECTOR_PASSWORD"],
  });

  if (!result.success) {
    console.error("❌ การตรวจสอบ Environment Variables ล้มเหลว:");
    console.error(result.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables");
  }

  return result.data;
}

export const env = parseEnv();
