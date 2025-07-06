import { supabase } from './supabase';

export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error };
    }
    
    console.log('Supabase connection test successful');
    return { success: true, data };
  } catch (error) {
    console.error('Exception during Supabase connection test:', error);
    return { success: false, error };
  }
};

export const testEnvironmentVariables = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Environment variables check:', {
    url: url ? `${url.substring(0, 20)}...` : 'missing',
    key: key ? `${key.substring(0, 20)}...` : 'missing'
  });
  
  return {
    urlPresent: !!url,
    keyPresent: !!key,
    bothPresent: !!(url && key)
  };
};

export const testUserCreation = async (email: string, password: string, username: string) => {
  console.log('Testing user creation...');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: username,
        },
      },
    });
    
    console.log('User creation result:', { data, error });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Check if profile was created
    if (data.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      console.log('Profile check result:', { profile, profileError });
      
      if (profileError) {
        return { success: false, error: 'User created but profile not found' };
      }
      
      return { success: true, user: data.user, profile };
    }
    
    return { success: false, error: 'No user data returned' };
    
  } catch (error) {
    console.error('User creation test failed:', error);
    return { success: false, error: 'User creation test failed' };
  }
}; 