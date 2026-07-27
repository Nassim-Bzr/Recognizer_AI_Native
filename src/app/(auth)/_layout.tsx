import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useAuth } from '@/lib/auth';
import { colors } from '@/lib/theme';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (!loading && session) {
    return <Redirect href="/(tabs)/history" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    />
  );
}
