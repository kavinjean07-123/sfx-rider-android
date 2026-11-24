import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View, ToastAndroid } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { call, getToken, setToken, setSessionLostHandler } from './src/api';
import { stopUpdates } from './src/location/tracking';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CpcSelectScreen from './src/screens/CpcSelectScreen';
import MessageScreen from './src/screens/MessageScreen';
import { COLORS } from './src/config';

export default function App() {
  const [state, setState] = useState({ status: 'loading' });
  const [changingCpc, setChangingCpc] = useState(false);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const token = await getToken();
    if (!token) return setState({ status: 'signedOut' });
    const res = await call('getProfile', token);
    if (res.ok) return setState({ status: 'ready', token, profile: res.profile });
    if (res.code === 'NETWORK' || res.code === 'SERVER') return setState({ status: 'error', message: res.error });
    setState({ status: 'signedOut' });
  }, []);

  useEffect(() => {
    setSessionLostHandler((msg) => {
      stopUpdates().catch(() => {});
      ToastAndroid.show(msg || 'Please log in again.', ToastAndroid.LONG);
      setState({ status: 'signedOut' });
    });
    load();
  }, [load]);

  const onLoggedIn = async (token, profile) => {
    await setToken(token);
    setState({ status: 'ready', token, profile });
  };
  const onProfile = useCallback((profile) => {
    setState((s) => ({ ...s, profile }));
    setChangingCpc(false);
  }, []);
  const updateProfile = useCallback((profile) => setState((s) => ({ ...s, profile })), []);
  const onLogout = async () => {
    await stopUpdates().catch(() => {});
    await setToken(null);
    setChangingCpc(false);
    setState({ status: 'signedOut' });
  };

  let screen;
  if (state.status === 'loading') {
    screen = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.ink }}>
        <ActivityIndicator size="large" color={COLORS.lime} />
      </View>
    );
  } else if (state.status === 'signedOut') {
    screen = <LoginScreen onLoggedIn={onLoggedIn} />;
  } else if (state.status === 'error') {
    screen = (
      <MessageScreen
        title="Couldn't connect"
        message={state.message}
        actionLabel="Try again"
        onAction={load}
        secondaryLabel="Log out"
        onSecondary={onLogout}
      />
    );
  } else if (!state.profile.cpc || changingCpc) {
    screen = (
      <CpcSelectScreen
        token={state.token}
        profile={state.profile}
        onDone={onProfile}
        onCancel={state.profile.cpc ? () => setChangingCpc(false) : undefined}
      />
    );
  } else {
    screen = (
      <HomeScreen
        token={state.token}
        profile={state.profile}
        onProfile={updateProfile}
        onChangeCpc={() => setChangingCpc(true)}
        onLogout={onLogout}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {screen}
    </SafeAreaProvider>
  );
}
