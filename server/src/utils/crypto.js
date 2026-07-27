const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getMasterKey() {
  const secret = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'yamora_chips_master_secret_key_32_bytes_len!!';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/**
 * Encrypt plain text using AES-256-GCM.
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') return '';
  // If already encrypted format (enc:...), return as is
  if (text.startsWith('enc:')) return text;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getMasterKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 */
function decrypt(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') return '';
  if (!ciphertext.startsWith('enc:')) return ciphertext;

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 4) return ciphertext;

    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedText = parts[3];
    const key = getMasterKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return '';
  }
}

/**
 * Mask sensitive values (e.g. rzp_live_xxxxxxxx****)
 */
function maskSecret(str, visibleChars = 4) {
  if (!str || typeof str !== 'string') return '';
  const plain = decrypt(str);
  if (!plain) return '';
  if (plain.length <= visibleChars * 2) {
    return '••••••••';
  }
  const start = plain.slice(0, visibleChars + 3);
  return `${start}••••••••`;
}

module.exports = {
  encrypt,
  decrypt,
  maskSecret
};
