/**
 * Inworld JWT Token Generator
 * 
 * This script generates a JWT token for authenticating with Inworld's API.
 * The token can be used to make requests to various Inworld endpoints.
 * 
 * Example usage of the generated token:
 * 
 * ```
 * const response = await fetch('https://api.inworld.ai/tts/v1alpha/voices', {
 *   headers: {
 *     'Authorization': 'Bearer ...',
 *     'Content-Type': 'application/json'
 *   }
 * });
 * ```
 */
import * as crypto from 'crypto';
import { HmacSHA256 } from 'crypto-js';
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Interfaces
interface ApiKey {
  key: string;
  secret: string;
}

// Resolves the API key + secret pair. Prefers INWORLD_API_KEY (the Basic
// Base64 credential from the Studio API Keys panel); falls back to
// INWORLD_KEY + INWORLD_SECRET for older .env files.
function resolveApiKey(): ApiKey {
  const basic = (process.env.INWORLD_API_KEY || '').trim();
  if (basic) {
    const decoded = Buffer.from(basic, 'base64').toString('utf8');
    const idx = decoded.indexOf(':');
    const key = idx > 0 ? decoded.slice(0, idx) : '';
    const secret = idx > 0 ? decoded.slice(idx + 1) : '';
    if (!key || !secret) throw new Error('INWORLD_API_KEY must be base64 of "<key>:<secret>" (both parts non-empty)');
    return { key, secret };
  }
  const key = (process.env.INWORLD_KEY || '').trim();
  const secret = (process.env.INWORLD_SECRET || '').trim();
  if (!key || !secret) throw new Error('Set INWORLD_API_KEY (Basic Base64 from the Studio API Keys panel) or both INWORLD_KEY and INWORLD_SECRET');
  return { key, secret };
}

/**
 * JWT Token Response from Inworld API
 * 
 * Example response:
 * {
 *   "token": "...",
 *   "type": "Bearer",
 *   "expirationTime": "2025-05-16T02:50:26Z",
 *   "sessionId": "default:fbbbbaaa-4c59-4fe6-88ee-3d27f4741fae"
 * }
 * 
 * This token can be used to make authenticated requests to Inworld's API by including
 * it in the Authorization header as: "Authorization: Bearer <token>"
 */
interface JwtTokenResponse {
  token: string;
  expirationTime: string;
  type: string;
  sessionId?: string;
}

// Helper functions
function getDateTime(): string {
  const parts = new Date().toISOString().split('T');
  const date = parts[0].replace(/-/g, '');
  const time = parts[1].replace(/:/g, '').substring(0, 6);

  return `${date}${time}`;
}

function getSignatureKey(key: string, params: string[]): string {
  let signature: string | CryptoJS.lib.WordArray = `IW1${key}`;

  params.forEach((p) => {
    signature = HmacSHA256(p, signature);
  });

  return HmacSHA256('iw1_request', signature).toString();
}

function getAuthorization({host, apiKey, engineHost}: { host: string; apiKey: ApiKey, engineHost: string }): string {
  const { key, secret } = apiKey;
  const path = '/ai.inworld.engine.WorldEngine/GenerateToken';

  const datetime = getDateTime();
  const nonce = crypto.randomBytes(16).toString('hex').slice(1, 12);
  const method = path.substring(1, path.length);

  const signature = getSignatureKey(secret, [
    datetime,
      engineHost.replace(':443', ''),
    method,
    nonce,
  ]);

  return `IW1-HMAC-SHA256 ApiKey=${key},DateTime=${datetime},Nonce=${nonce},Signature=${signature}`;
}

function generateAuthHeader(): string {
  const apiKey: ApiKey = resolveApiKey();

  const host = process.env.INWORLD_HOST || 'api.inworld.ai';
    const engineHost = process.env.INWORLD_ENGINE_HOST || 'api-engine.inworld.ai';
    return getAuthorization({host, apiKey, engineHost});
}

// API functions
async function getJwtToken(): Promise<JwtTokenResponse> {
  const host = process.env.INWORLD_HOST || 'api.inworld.ai';
  const authHeader = generateAuthHeader();
  const apiKey = resolveApiKey().key;
  const workspaceName = process.env.INWORLD_WORKSPACE || 'workspaces/default-workspace';
  
  try {
    const response = await axios.post<JwtTokenResponse>(
      `https://${host}/auth/v1/tokens/token:generate`,
      {
        key: apiKey,
        resources: [workspaceName]
      },
      {
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('API Error:', error.response?.data || error.message);
    } else {
      console.error('Error:', error);
    }
    throw error;
  }
}

// Main function
async function main() {
  try {
    const jwtToken = await getJwtToken();
    console.log(JSON.stringify(jwtToken, null, 2));
    console.log('\nThis JWT token can be used to authenticate API requests to Inworld.');
    console.log('Include it in your API requests as:');
    console.log(`Authorization: ${jwtToken.type} ${jwtToken.token.substring(0, 15)}...`);
    console.log('\nThe token expires at:', jwtToken.expirationTime);
  } catch (error) {
    console.error('Error in main:', error);
  }
}

// Run the main function
main(); 