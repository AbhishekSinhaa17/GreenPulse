/**
 * GreenPulse Environment Configuration Module
 * Validates and provides typed access to client-safe environment variables.
 * NEVER import or expose server-side private secrets or service-role keys here.
 */

interface EnvConfig {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  stripePublicKey: string | null;
  appUrl: string;
  isSupabaseConfigured: boolean;
  demoPayments: boolean;
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rawStripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const rawAppUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
const rawDemoPayments = import.meta.env.VITE_DEMO_PAYMENTS;

// Detect if URL or Key is missing or using placeholder strings
const isPlaceholder = (val: unknown): boolean => {
  if (typeof val !== 'string') return true;
  const trimmed = val.trim();
  return (
    trimmed === '' ||
    trimmed.includes('your-project-id') ||
    trimmed.includes('placeholder') ||
    trimmed.includes('mock-') ||
    trimmed === 'undefined' ||
    trimmed === 'null'
  );
};

const isSupabaseConfigured = !isPlaceholder(rawSupabaseUrl) && !isPlaceholder(rawSupabaseAnonKey);
const demoPayments = rawDemoPayments === 'true' || rawDemoPayments === true;

export const env: EnvConfig = {
  supabaseUrl: isSupabaseConfigured ? String(rawSupabaseUrl).trim() : null,
  supabaseAnonKey: isSupabaseConfigured ? String(rawSupabaseAnonKey).trim() : null,
  stripePublicKey: !isPlaceholder(rawStripePublicKey) ? String(rawStripePublicKey).trim() : null,
  appUrl: rawAppUrl,
  isSupabaseConfigured,
  demoPayments,
};
