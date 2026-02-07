export default function getBaseUrl() {
  if (process.env.VERCEL_ENV === "production") {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  } else if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  } else if (process.env.VERCEL_ENV === "development") {
    return `http://localhost:3000`;
  }
}
