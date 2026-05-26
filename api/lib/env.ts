import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  intraDomain: process.env.INTRA_DOMAIN ?? process.env.VITE_INTRA_DOMAIN ?? "https://zone01oujda.ma",
  jwtSecret: process.env.JWT_SECRET ?? "super-secret-default-key-for-dev",
};
