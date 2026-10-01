import { Alert, Platform, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppHeader } from '../components/AppHeader';
import { ClockCard } from '../components/ClockCard';
import { MyRequests } from '../components/MyRequests';
import { Screen } from '../components/Screen';
import { Button, H1, Muted } from '../components/ui';
import { colors } from '../components/theme';
import { useAuth } from '../lib/auth';

/**
 * Inklokscherm. Startscherm voor medewerkers, en waar de QR-code op de werkvloer naartoe gaat
 * (klokit://klok). Niet ingelogd? Dan eerst naar inloggen.
 */
export default function Klok() {
  const { me, logout } = useAuth();
  if (!me) return <Redirect href="/login" />;
  const isManager = me.user.role !== 'employee';

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  function confirmLogout() {
    if (Platform.OS === 'web') return handleLogout();
    Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Uitloggen', style: 'destructive', onPress: handleLogout },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <AppHeader onAvatarPress={isManager ? () => router.navigate('/meer') : confirmLogout} />
      <Screen>
        <Muted>Hoi {me.user.firstName}</Muted>
        <H1 style={{ marginBottom: 16 }}>Klaar voor je dienst?</H1>

        <ClockCard showHistory />
        <MyRequests />

        {isManager ? (
          <Button title="Naar overzicht" variant="outline" onPress={() => router.replace('/')} full />
        ) : (
          <Button title="Uitloggen" variant="outline" onPress={confirmLogout} full />
        )}
      </Screen>
    </View>
  );
}
