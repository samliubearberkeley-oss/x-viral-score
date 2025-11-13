import { createClient } from '@insforge/sdk';

// Get Insforge backend URL from environment variable
// Defaults to your deployed Insforge backend
const baseUrl = import.meta.env.VITE_INSFORGE_URL || 'https://b4ndrg6i.us-east.insforge.app';

// Get API Key from environment variable (for authentication)
// This is used for all operations: storage, database, AI, etc.
const apiKey = import.meta.env.VITE_INSFORGE_API_KEY || 'ik_4e49ca2fd1554c8a5adcbbcd5dfc78e6';

// Create and export Insforge client instance with API Key
// For browser SDK, use edgeFunctionToken parameter to pass API key
// This token will be sent as Authorization header for all requests
export const insforgeClient = createClient({ 
  baseUrl,
  // Use edgeFunctionToken for browser SDK - this sets Authorization header
  edgeFunctionToken: apiKey
});

