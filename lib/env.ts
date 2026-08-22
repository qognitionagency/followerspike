export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string, fallback = ""): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : fallback;
}

/**
 * The site's own origin, with no trailing slash.
 *
 * This is the base for every canonical tag, Open Graph url, JSON-LD @id,
 * sitemap entry and robots host, so getting it wrong is not cosmetic: for as
 * long as APP_URL was unset in production, all of those resolved to
 * `http://localhost:3000` and told search engines the canonical home of the
 * site was a loopback address.
 *
 * Hence the ladder rather than a bare fallback. Vercel injects the last two
 * itself, so a deployment is correct with no configuration at all:
 *
 *   APP_URL                        an explicit custom domain, always wins
 *   VERCEL_PROJECT_PRODUCTION_URL  the project's stable production domain
 *   VERCEL_URL                     this deployment only — right for previews,
 *                                  wrong as a canonical, which is why it sits
 *                                  below the production domain
 *   http://localhost:3000          local development
 *
 * Set APP_URL anyway once the custom domain is live: the Vercel values are
 * `*.vercel.app`, which is a correct origin but not the one you want indexed.
 */
export function appUrl(): string {
  const explicit = optionalEnv("APP_URL");
  if (explicit) return normalizeOrigin(explicit);

  const productionDomain = optionalEnv("VERCEL_PROJECT_PRODUCTION_URL");
  if (productionDomain) return normalizeOrigin(productionDomain);

  const deploymentDomain = optionalEnv("VERCEL_URL");
  if (deploymentDomain) return normalizeOrigin(deploymentDomain);

  return "http://localhost:3000";
}

/** Vercel supplies a bare host; APP_URL is usually written with a scheme. Accept both. */
function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
