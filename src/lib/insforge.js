import { createClient } from '@insforge/sdk';

// Get Insforge backend URL from environment variable
// Defaults to your deployed Insforge backend
const baseUrl = import.meta.env.VITE_INSFORGE_URL || 'https://b4ndrg6i.us-east.insforge.app';

// Get API Key from environment variable (for Edge Function authentication)
const apiKey = import.meta.env.VITE_INSFORGE_API_KEY || 'ik_4e49ca2fd1554c8a5adcbbcd5dfc78e6';

// Create and export Insforge client instance with API Key
export const insforgeClient = createClient({ 
  baseUrl,
  apiKey: apiKey  // This key is sent to Edge Functions for authentication
});

