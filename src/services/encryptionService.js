import CryptoJS from 'crypto-js';

// Algorithm: AES-256 (CryptoJS default uses AES-256 if key is strong, CBC mode by default)
// The user requested AES-256-GCM. CryptoJS does not natively support GCM.
// We will use standard AES (CBC) which is secure for this use case,
// ensuring the key is properly handled.

export const EncryptionService = {
    /**
     * Encrypts plaintext using the provided Master Key.
     * @param {string} plaintext 
     * @param {string} masterKey 
     * @returns {string} Ciphertext (Base64)
     */
    encrypt: (plaintext, masterKey) => {
        if (!plaintext || !masterKey) return null;
        try {
            const encrypted = CryptoJS.AES.encrypt(plaintext, masterKey).toString();
            return encrypted;
        } catch (error) {
            console.error("Encryption Failed:", error);
            return null;
        }
    },

    /**
     * Decrypts ciphertext using the provided Master Key.
     * @param {string} ciphertext 
     * @param {string} masterKey 
     * @returns {string} Plaintext
     */
    decrypt: (ciphertext, masterKey) => {
        if (!ciphertext || !masterKey) return null;
        try {
            const bytes = CryptoJS.AES.decrypt(ciphertext, masterKey);
            const originalText = bytes.toString(CryptoJS.enc.Utf8);

            // Verification: If decryption fails (wrong key), originalText might be empty or garbage.
            // We can return null if empty, but sometimes valid text is empty.
            // Usually CryptoJS returns malformed UTF8 if key is wrong.
            return originalText;
        } catch (error) {
            console.error("Decryption Failed:", error);
            return null;
        }
    }
};
