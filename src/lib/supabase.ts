import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Vrai si les variables d'environnement Supabase sont renseignées (.env) */
export const isSupabaseConfigured =
  supabaseUrl.startsWith('http') && supabaseAnonKey.length > 20;

// Sur mobile, la session est persistée dans AsyncStorage.
// Sur web (et pendant le rendu côté serveur d'Expo, où `window` n'existe pas),
// on laisse supabase-js gérer son stockage par défaut — il est compatible SSR.
const isNative = Platform.OS !== 'web';

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      ...(isNative ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Rafraîchit le token uniquement quand l'app est au premier plan (mobile)
if (isNative) {
  AppState.addEventListener('change', (state) => {
    if (!isSupabaseConfigured) return;
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
