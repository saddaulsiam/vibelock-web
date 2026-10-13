import crypto from "crypto";

/**
 * Normalizes a raw PEM string or base64 key into a standard PEM certificate format.
 * Handles escaped newlines ("\\n"), missing headers, and multi-line formatting.
 */
export function formatPemKey(rawKey: string, type: "PUBLIC" | "PRIVATE"): string {
  if (!rawKey) return "";
  let key = rawKey.trim();

  // Replace literal '\n' with real newlines
  if (key.includes("\\n")) {
    key = key.replace(/\\n/g, "\n");
  }

  // If already standard PEM, return cleaned
  if (key.includes("-----BEGIN")) {
    return key;
  }

  // Strip all whitespace and format into standard 64-character lines
  const cleanBase64 = key.replace(/\s+/g, "");
  const lines: string[] = [];
  for (let i = 0; i < cleanBase64.length; i += 64) {
    lines.push(cleanBase64.slice(i, i + 64));
  }
  const formattedBody = lines.join("\n");

  if (type === "PUBLIC") {
    return `-----BEGIN PUBLIC KEY-----\n${formattedBody}\n-----END PUBLIC KEY-----`;
  } else {
    return `-----BEGIN RSA PRIVATE KEY-----\n${formattedBody}\n-----END RSA PRIVATE KEY-----`;
  }
}

/**
 * Internal helper to parse and validate an RSA public key into a crypto.KeyObject.
 * Supports standard SPKI (-----BEGIN PUBLIC KEY-----) and PKCS#1 (-----BEGIN RSA PUBLIC KEY-----).
 */
export function parsePublicKey(rawKey: string): { keyObject: crypto.KeyObject; format: "SPKI" | "PKCS#1" } {
  if (!rawKey || !rawKey.trim()) {
    throw new Error("Public key cannot be empty");
  }
  const key = rawKey.trim().replace(/\\n/g, "\n");
  if (key.includes("-----BEGIN")) {
    const keyObject = crypto.createPublicKey(key);
    const format = key.includes("RSA") ? "PKCS#1" : "SPKI";
    return { keyObject, format };
  }

  const cleanBase64 = key.replace(/\s+/g, "");
  const lines: string[] = [];
  for (let i = 0; i < cleanBase64.length; i += 64) {
    lines.push(cleanBase64.slice(i, i + 64));
  }
  const formattedBody = lines.join("\n");

  try {
    const spki = `-----BEGIN PUBLIC KEY-----\n${formattedBody}\n-----END PUBLIC KEY-----`;
    const keyObject = crypto.createPublicKey(spki);
    return { keyObject, format: "SPKI" };
  } catch {
    const pkcs1 = `-----BEGIN RSA PUBLIC KEY-----\n${formattedBody}\n-----END RSA PUBLIC KEY-----`;
    const keyObject = crypto.createPublicKey(pkcs1);
    return { keyObject, format: "PKCS#1" };
  }
}

/**
 * Internal helper to parse and validate an RSA private key into a crypto.KeyObject.
 * Supports standard PKCS#1 (-----BEGIN RSA PRIVATE KEY-----) and PKCS#8 (-----BEGIN PRIVATE KEY-----).
 */
export function parsePrivateKey(rawKey: string): { keyObject: crypto.KeyObject; format: "PKCS#1" | "PKCS#8" } {
  if (!rawKey || !rawKey.trim()) {
    throw new Error("Private key cannot be empty");
  }
  const key = rawKey.trim().replace(/\\n/g, "\n");
  if (key.includes("-----BEGIN")) {
    const keyObject = crypto.createPrivateKey(key);
    const format = key.includes("RSA") ? "PKCS#1" : "PKCS#8";
    return { keyObject, format };
  }

  const cleanBase64 = key.replace(/\s+/g, "");
  const lines: string[] = [];
  for (let i = 0; i < cleanBase64.length; i += 64) {
    lines.push(cleanBase64.slice(i, i + 64));
  }
  const formattedBody = lines.join("\n");

  try {
    const pkcs1 = `-----BEGIN RSA PRIVATE KEY-----\n${formattedBody}\n-----END RSA PRIVATE KEY-----`;
    const keyObject = crypto.createPrivateKey(pkcs1);
    return { keyObject, format: "PKCS#1" };
  } catch {
    const pkcs8 = `-----BEGIN PRIVATE KEY-----\n${formattedBody}\n-----END PRIVATE KEY-----`;
    const keyObject = crypto.createPrivateKey(pkcs8);
    return { keyObject, format: "PKCS#8" };
  }
}

/**
 * Encrypts a plain text string using Nagad's Public Key with RSA PKCS#1 v1.5 padding.
 * Enforces authoritative single-block RSA semantics (max 245 bytes for 2048-bit key).
 * Multi-block chunking is strictly unsupported by the Nagad DFS API protocol.
 * Returns Base64-encoded cipher text (exactly 256 bytes for 2048-bit key).
 */
export function encryptWithPublicKey(plainText: string, publicKeyPem: string): string {
  const { keyObject } = parsePublicKey(publicKeyPem);
  const modulusLength = keyObject.asymmetricKeyDetails?.modulusLength || 2048;
  const maxPlaintextSize = Math.floor(modulusLength / 8) - 11;

  const buffer = Buffer.from(plainText, "utf8");
  if (buffer.length > maxPlaintextSize) {
    throw new Error(
      `Plaintext size (${buffer.length} bytes) exceeds maximum RSA block size of ${maxPlaintextSize} bytes for ${modulusLength}-bit key.`
    );
  }

  const encrypted = crypto.publicEncrypt(
    {
      key: keyObject,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  );

  const expectedCiphertextSize = Math.floor(modulusLength / 8);
  if (encrypted.length !== expectedCiphertextSize) {
    throw new Error(
      `Unexpected ciphertext size: ${encrypted.length} bytes (expected ${expectedCiphertextSize} bytes).`
    );
  }

  return encrypted.toString("base64");
}

/**
 * Decrypts a Base64-encoded cipher text using the Merchant Private Key with RSA PKCS#1 v1.5 padding.
 * Enforces authoritative single-block RSA semantics (exactly 256 bytes for 2048-bit key).
 * Multi-block chunking is strictly unsupported by the Nagad DFS API protocol.
 * Returns the plain text utf8 string.
 */
export function decryptWithPrivateKey(cipherTextBase64: string, privateKeyPem: string): string {
  if (!cipherTextBase64 || !cipherTextBase64.trim()) {
    throw new Error("Ciphertext cannot be empty");
  }

  const { keyObject } = parsePrivateKey(privateKeyPem);
  const modulusLength = keyObject.asymmetricKeyDetails?.modulusLength || 2048;
  const expectedBlockSize = Math.floor(modulusLength / 8);

  const buffer = Buffer.from(cipherTextBase64.trim(), "base64");
  if (buffer.length !== expectedBlockSize) {
    throw new Error(
      `Ciphertext size (${buffer.length} bytes) does not match expected single-block RSA size of ${expectedBlockSize} bytes for ${modulusLength}-bit key.`
    );
  }

  const decrypted = crypto.privateDecrypt(
    {
      key: keyObject,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    buffer
  );

  return decrypted.toString("utf8");
}

/**
 * Generates an RSA-SHA256 digital signature of a plain text string using the Merchant Private Key.
 * Returns Base64-encoded signature.
 */
export function signWithPrivateKey(plainText: string, privateKeyPem: string): string {
  const { keyObject } = parsePrivateKey(privateKeyPem);
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(plainText, "utf8");
  signer.end();
  return signer.sign(keyObject, "base64");
}

/**
 * Verifies an RSA-SHA256 digital signature against a plain text string using Nagad's Public Key.
 */
export function verifyWithPublicKey(
  plainText: string,
  signatureBase64: string,
  publicKeyPem: string
): boolean {
  try {
    const { keyObject } = parsePublicKey(publicKeyPem);
    const verifier = crypto.createVerify("RSA-SHA256");
    verifier.update(plainText, "utf8");
    verifier.end();
    return verifier.verify(keyObject, signatureBase64.trim(), "base64");
  } catch {
    return false;
  }
}

/**
 * Generates a random cryptographic challenge string (40 characters hex).
 */
export function generateChallenge(): string {
  return crypto.randomBytes(20).toString("hex");
}

/**
 * Formats a Date object into Nagad's required timestamp format: YYYYMMDDHHmmss.
 */
export function formatNagadDateTime(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export interface KeyValidationResult {
  isValid: boolean;
  type?: "RSA";
  modulusLength?: number;
  format?: "PKCS#1" | "PKCS#8" | "SPKI";
  error?: string;
}

/**
 * Validates whether the given raw key string is complete and decodes as a valid RSA key.
 * If expectedModulusLength is provided, also verifies that the modulus matches (e.g. 2048).
 * Never prints or leaks key material.
 */
export function validateRsaKeyMaterial(
  rawKey: string | undefined | null,
  type: "PUBLIC" | "PRIVATE",
  expectedModulusLength?: number
): KeyValidationResult {
  if (!rawKey || !rawKey.trim()) {
    return { isValid: false, error: "Empty key material" };
  }

  try {
    if (type === "PUBLIC") {
      const { keyObject, format } = parsePublicKey(rawKey);
      if (keyObject.asymmetricKeyType !== "rsa") {
        return { isValid: false, error: `Unsupported key type: ${keyObject.asymmetricKeyType}` };
      }
      const modulusLength = keyObject.asymmetricKeyDetails?.modulusLength;
      if (expectedModulusLength && modulusLength !== expectedModulusLength) {
        return {
          isValid: false,
          type: "RSA",
          modulusLength,
          error: `Key modulus length (${modulusLength} bits) does not match required ${expectedModulusLength} bits`,
        };
      }
      return {
        isValid: true,
        type: "RSA",
        modulusLength,
        format,
      };
    } else {
      const { keyObject, format } = parsePrivateKey(rawKey);
      if (keyObject.asymmetricKeyType !== "rsa") {
        return { isValid: false, error: `Unsupported key type: ${keyObject.asymmetricKeyType}` };
      }
      const modulusLength = keyObject.asymmetricKeyDetails?.modulusLength;
      if (expectedModulusLength && modulusLength !== expectedModulusLength) {
        return {
          isValid: false,
          type: "RSA",
          modulusLength,
          error: `Key modulus length (${modulusLength} bits) does not match required ${expectedModulusLength} bits`,
        };
      }
      return {
        isValid: true,
        type: "RSA",
        modulusLength,
        format,
      };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid key structure";
    return { isValid: false, error: message };
  }
}
