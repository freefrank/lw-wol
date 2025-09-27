import crypto from 'node:crypto';

const tokens = new Map();

export function createToken() {
  const token = crypto.randomUUID();
  tokens.set(token, { createdAt: Date.now() });
  return token;
}

export function validateToken(token) {
  if (!token) {
    return false;
  }
  return tokens.has(token);
}

export function revokeToken(token) {
  tokens.delete(token);
}

export function revokeAllTokens() {
  tokens.clear();
}
