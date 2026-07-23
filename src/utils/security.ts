/**
 * Security utilities for LifeOS Pro.
 * Provides client-side PIN hashing and AES-GCM encryption using the native Web Crypto API.
 */

// Hash a PIN using SHA-256 for local screen-lock verification
export async function hashPin(pin: string, salt: string = 'lifeos_pro_salt'): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + salt);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Derive a CryptoKey from a PIN using PBKDF2
export async function deriveKeyFromPin(pin: string, saltStr: string = 'lifeos_pro_key_salt'): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinData = encoder.encode(pin);
  const salt = encoder.encode(saltStr);

  // Import raw PIN bytes as a key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    pinData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive an AES-GCM key
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt string data using AES-GCM
export async function encryptData(text: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 12-byte IV for AES-GCM

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    data
  );

  // Convert buffer and IV to Base64/Hex strings for storage
  const encryptedBytes = new Uint8Array(encryptedBuffer);
  let ciphertext = '';
  encryptedBytes.forEach(byte => ciphertext += String.fromCharCode(byte));
  const base64Cipher = window.btoa(ciphertext);

  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');

  return {
    ciphertext: base64Cipher,
    iv: ivHex
  };
}

// Decrypt ciphertext using AES-GCM
export async function decryptData(base64Cipher: string, ivHex: string, key: CryptoKey): Promise<string> {
  // Decode base64 cipher
  const binaryString = window.atob(base64Cipher);
  const encryptedData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    encryptedData[i] = binaryString.charCodeAt(i);
  }

  // Parse IV from Hex
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    throw new Error('Pin incorrecto o datos corruptos. Falló la desencriptación.');
  }
}
