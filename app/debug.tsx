import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { testEnvironmentVariables, testSupabaseConnection } from '../lib/test-connection';

export default function DebugScreen() {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    try {
      // Test environment variables
      const envTest = testEnvironmentVariables();
      
      // Test Supabase connection
      const connectionTest = await testSupabaseConnection();
      
      setTestResults({
        environment: envTest,
        connection: connectionTest,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setTestResults({
        error: error,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Debug Screen</Text>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={runTests}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Running Tests...' : 'Run Connection Tests'}
        </Text>
      </TouchableOpacity>

      {testResults && (
        <View style={styles.results}>
          <Text style={styles.sectionTitle}>Test Results:</Text>
          <Text style={styles.timestamp}>
            {new Date(testResults.timestamp).toLocaleString()}
          </Text>
          
          {testResults.error ? (
            <Text style={styles.error}>Error: {JSON.stringify(testResults.error, null, 2)}</Text>
          ) : (
            <>
              <Text style={styles.subtitle}>Environment Variables:</Text>
              <Text style={styles.result}>
                URL Present: {testResults.environment?.urlPresent ? '✅' : '❌'}
              </Text>
              <Text style={styles.result}>
                Key Present: {testResults.environment?.keyPresent ? '✅' : '❌'}
              </Text>
              
              <Text style={styles.subtitle}>Connection Test:</Text>
              <Text style={styles.result}>
                Success: {testResults.connection?.success ? '✅' : '❌'}
              </Text>
              {testResults.connection?.error && (
                <Text style={styles.error}>
                  Error: {JSON.stringify(testResults.connection.error, null, 2)}
                </Text>
              )}
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  results: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#374151',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  result: {
    fontSize: 14,
    marginBottom: 4,
    color: '#374151',
  },
  error: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 8,
  },
}); 