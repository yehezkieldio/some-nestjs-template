import { z } from "zod";

export const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().positive().default(3001),
});

export type EnvSchema = z.infer<typeof envSchema>;
