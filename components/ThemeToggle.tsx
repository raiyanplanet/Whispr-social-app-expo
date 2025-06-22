import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'medium', 
  showLabel = false 
}) => {
  const { theme, isDark, setTheme, colors } = useTheme();

  const getIconName = () => {
    if (theme === 'system') return 'settings';
    return isDark ? 'sunny' : 'moon';
  };

  const getSize = () => {
    switch (size) {
      case 'small': return 20;
      case 'large': return 28;
      default: return 24;
    }
  };

  const handlePress = () => {
    Alert.alert(
      'Choose Theme',
      'Select your preferred theme',
      [
        {
          text: 'Light',
          onPress: () => setTheme('light'),
        },
        {
          text: 'Dark',
          onPress: () => setTheme('dark'),
        },
        {
          text: 'System',
          onPress: () => setTheme('system'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons 
        name={getIconName() as any} 
        size={getSize()} 
        color={colors.text} 
      />
      {showLabel && (
        <Text style={{ 
          marginLeft: 8, 
          color: colors.text,
          fontSize: 16,
          fontWeight: '500',
        }}>
          {theme === 'system' ? 'System' : theme === 'dark' ? 'Dark' : 'Light'}
        </Text>
      )}
    </TouchableOpacity>
  );
}; 