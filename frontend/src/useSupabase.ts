import { useSession } from '@clerk/clerk-react';
import { createClient } from '@supabase/supabase-js';
import { useMemo } from 'react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function useSupabase() {
  const { session } = useSession();

  return useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          // This tells Clerk to give us a special token that Supabase understands
          const clerkToken = await session?.getToken({ template: 'supabase' });
          console.log("Clerk Token for Supabase:", clerkToken ? "Present" : "Missing");
          const headers = new Headers(options?.headers);
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    });
  }, [session]);
}
