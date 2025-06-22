// Environment configuration
export const config = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
  },
  storage: {
    bucket: process.env.EXPO_PUBLIC_STORAGE_BUCKET || 'post-images',
  },
}; 