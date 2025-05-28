# JWT Sample App for Inworld API

This sample Node.js application demonstrates how to generate JWT tokens for authentication with the Inworld API.

## Overview

This app shows two important steps for authentication with the Inworld API:

1. Generating an HMAC-SHA256 signed authorization header
2. Using this header to make an API call to get a JWT token from the token generation endpoint

The entire implementation is in `src/index.ts`, making it easy to understand and adapt for your needs.

## Prerequisites

- Node.js (v14 or later)
- Yarn or npm
- Valid Inworld API credentials

## Setup

1. Install dependencies:
   ```
   yarn install
   ```
   or
   ```
   npm install
   ```

2. Create a `.env` file with your Inworld API credentials:
   ```
   INWORLD_KEY=your_jwt_key_here
   INWORLD_SECRET=your_jwt_secret_here
   INWORLD_HOST=api.inworld.ai
   INWORLD_WORKSPACE=workspaces/your-workspace-id
   ```

## Build

Compile the TypeScript code:

```
yarn build
```
or
```
npm run build
```

If you encounter "tsc: command not found", install TypeScript globally:
```
yarn global add typescript
```
or
```
npm install -g typescript
```

## Run

Execute the sample app:

```
yarn start
```
or
```
npm start
```

## JWT Token Response

When you run the application, it will generate a JWT token for authenticating with the Inworld API. The response will look like this:

```json
{
  "token": "...",
  "type": "Bearer",
  "expirationTime": "2025-05-16T02:50:26Z",
  "sessionId": "default:fbbbbaaa-4c59-4fe6-88ee-3d27f4741fae"
}
```

## Using the JWT Token

You can use this token to make authenticated requests to various Inworld API endpoints. Include it in your API requests as follows:

```javascript
const response = await fetch('https://api.inworld.ai/tts/v1alpha/voices', {
  headers: {
    'Authorization': 'Bearer ...',
    'Content-Type': 'application/json'
  }
});
```

The token will be valid until the time specified in the `expirationTime` field.

## Implementation Approach

The sample app uses Axios HTTP Client to make the API call:

```typescript
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
```

## Proto Message Definition

The implementation uses the following proto message definition for the token generation endpoint:

```protobuf
message GenerateTokenRequest {
  // API key itself
  string key = 1;
  // Resource which will be used with the token
  repeated string resources = 2;
}

service WorldEngine {
  rpc GenerateToken(GenerateTokenRequest) returns (AccessToken) {
    option (google.api.http) = {
      post : "/auth/v1/tokens/token:generate",
      body: "*"
    };
  }
}
```

## Signature Generation Algorithm

The signature is generated using HMAC-SHA256 as follows:

```typescript
// Generate signature key using same algorithm as server
function getSignatureKey(key: string, params: string[]) {
  // Start with IW1 prefix + key
  let signature = `IW1${key}`;
  
  // Apply each parameter through HMAC-SHA256
  for (const param of params) {
    signature = HmacSHA256(param, signature).toString(enc.Hex);
  }
  
  // Final signature with iw1_request
  return HmacSHA256('iw1_request', signature).toString(enc.Hex);
}
```

The parameters used for the signature are:
1. DateTime (in format YYYYMMDDHHMMSS)
2. Host (without port)
3. Method (in format 'ai.inworld.engine.WorldEngine/GenerateToken')
4. Nonce (random hex string)

## Troubleshooting Authentication Issues

If you receive a 403 Forbidden error with "invalid authorization signature", consider the following:

1. **Check API Credentials**: Ensure your API key and secret are valid and have not expired.

2. **Workspace Name**: The correct format for the workspace name is typically: `workspaces/your-workspace-id`. This should be set in your `.env` file.

3. **API Endpoint**: Verify the token generation endpoint with Inworld's latest documentation. The current implementation uses:
   ```
   https://api.inworld.ai/auth/v1/tokens/token:generate
   ```

4. **Authorization Header**: The format of the authorization header is:
   ```
   IW1-HMAC-SHA256 ApiKey=your_key,DateTime=YYYYMMDDHHMMSS,Nonce=random_nonce,Signature=signature
   ```

5. **Request Body**: The implementation includes the key and resources in the request body:
   ```json
   {
     "key": "your_api_key",
     "resources": ["workspaces/your-workspace-id"]
   }
   ```

6. **Headers Format**: While HTTP headers are case-insensitive according to the HTTP specification, it's standard practice to use Pascal-case format in documentation. In code, they are typically represented as:
   ```
   Authorization: IW1-HMAC-SHA256 ...
   Host: api.inworld.ai
   Content-Type: application/json
   ```

## References

For the most current and accurate information, please refer to the official Inworld documentation. 
