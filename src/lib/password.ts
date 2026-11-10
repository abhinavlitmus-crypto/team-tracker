import "server-only";
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const KEY_LEN = 64;
const PARAMS = { N: 16384, r: 8, p: 1 };

function derive(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LEN, opts, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/** Hashes a password as "scrypt$N$r$p$salt$hash" (base64 parts). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  const { N, r, p } = PARAMS;
  return ["scrypt", N, r, p, salt.toString("base64"), key.toString("base64")].join("$");
}

// Used when no account matches, so a wrong email takes as long as a wrong password.
const DUMMY_HASH = hashPassword(randomBytes(16).toString("hex"));

/** Checks a password against a stored hash. Pass null to do a same-cost dummy check. */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const hash = stored ?? (await DUMMY_HASH);
  const [scheme, n, r, p, saltB64, keyB64] = hash.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await derive(password, Buffer.from(saltB64, "base64"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return stored !== null && actual.length === expected.length && timingSafeEqual(actual, expected);
}
