import crypto from "crypto";

/**
 * Generates a secure random API key.
 * Uses Node.js built-in crypto module.
 *
 * Output: URL-safe Base64 string (approx 43 characters for 32 bytes)
 */
function generateApiKey() {
  // Generate 32 bytes (256 bits) of random data
  const buffer = crypto.randomBytes(32);

  // Convert to URL-safe Base64 string (similar to nanoid)
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

const key = generateApiKey();
console.log(key);
