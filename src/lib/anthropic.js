import Anthropic from '@anthropic-ai/sdk'

// WARNING: VITE_ prefix exposes this key in the client bundle.
// Move this call to a backend endpoint (Supabase Edge Function, Vercel API route)
// before going to production.
export const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true,
  maxRetries: 0,
})
