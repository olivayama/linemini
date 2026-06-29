export const appEnvs = ["snd", "dev", "stg", "prd"] as const;
export type AppEnv = (typeof appEnvs)[number];
