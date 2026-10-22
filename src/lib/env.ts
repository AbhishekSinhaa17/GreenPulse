export interface EnvConfig {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  stripePublicKey: string | null;
  appUrl: string;
  isSupabaseConfigured: boolean;
  demoPayments: boolean;
  setDemoPayments: (enabled: boolean) => void;
}

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const rawStripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const rawAppUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');
const rawDemoPayments = import.meta.env.VITE_DEMO_PAYMENTS;

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

function checkDemoPaymentsActive(): boolean {
  if (typeof window !== 'undefined') {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const urlDemo = searchParams.get('demo');
      if (urlDemo === 'true') return true;
      if (urlDemo === 'false') return false;

      const stored = window.localStorage?.getItem('gp_demo_payments');
      if (stored === 'false') return false;
      if (stored === 'true') return true;
    } catch {
      // Ignore URL/localStorage parsing issues in restricted contexts
    }
  }

  // If VITE_DEMO_PAYMENTS is explicitly set to false, disable demo payments
  if (rawDemoPayments === 'false') {
    return false;
  }

  // By default, demo payments are enabled everywhere across the entire platform
  // so visitors, recruiters, and reviewers can evaluate donations and subscriptions safely.
  return true;
}

export const env: EnvConfig = {
  supabaseUrl: isSupabaseConfigured ? String(rawSupabaseUrl).trim() : null,
  supabaseAnonKey: isSupabaseConfigured ? String(rawSupabaseAnonKey).trim() : null,
  stripePublicKey: !isPlaceholder(rawStripePublicKey) ? String(rawStripePublicKey).trim() : null,
  appUrl: rawAppUrl,
  isSupabaseConfigured,
  get demoPayments(): boolean {
    return checkDemoPaymentsActive();
  },
  set demoPayments(val: boolean) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('gp_demo_payments', String(val));
      } catch {
        // Ignore
      }
    }
  },
  setDemoPayments(enabled: boolean) {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem('gp_demo_payments', String(enabled));
      } catch {
        // Ignore
      }
    }
  },
};

