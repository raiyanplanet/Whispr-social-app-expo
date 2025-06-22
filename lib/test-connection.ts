import { supabase } from './supabase';

export const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('Test 1: Checking connection...');
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    
    if (error) {
      console.error('Connection test failed:', error);
      return { success: false, error: 'Cannot connect to database' };
    }
    
    console.log('✅ Connection successful');
    
    // Test 2: Check if profiles table exists
    console.log('Test 2: Checking if profiles table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Table check failed:', tableError);
      return { success: false, error: 'Profiles table does not exist' };
    }
    
    console.log('✅ Profiles table exists');
    
    // Test 3: Check RLS policies
    console.log('Test 3: Checking RLS policies...');
    const { data: policyCheck, error: policyError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (policyError) {
      console.error('Policy check failed:', policyError);
      return { success: false, error: 'RLS policies not configured properly' };
    }
    
    console.log('✅ RLS policies working');
    
    return { success: true, message: 'All tests passed' };
    
  } catch (error) {
    console.error('Test failed with exception:', error);
    return { success: false, error: 'Test failed with exception' };
  }
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