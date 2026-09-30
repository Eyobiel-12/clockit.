import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppHeader } from '../../components/AppHeader';
import { Footer } from '../../components/Footer';
import { colors } from '../../components/theme';
import { useAuth } from '../../lib/auth';

/** Ingelogde omgeving voor eigenaren en managers: bovenbalk, schermen en de footer met tabs. */
export default function TabsLayout() {
  const { me } = useAuth();
  if (!me) return <Redirect href="/login" />;
  if (me.user.role === 'employee') return <Redirect href="/klok" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <AppHeader />
      <Tabs
        tabBar={(props) => <Footer {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      >
        <Tabs.Screen name="index" options={{ title: 'Overzicht' }} />
        <Tabs.Screen name="team" options={{ title: 'Team' }} />
        <Tabs.Screen name="uren" options={{ title: 'Urenoverzicht' }} />
        <Tabs.Screen name="correcties" options={{ title: 'Correcties' }} />
        <Tabs.Screen name="meer" options={{ title: 'Meer' }} />
      </Tabs>
    </View>
  );
}
