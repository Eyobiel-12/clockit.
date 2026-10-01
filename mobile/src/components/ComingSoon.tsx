import { router } from 'expo-router';
import { Screen } from './Screen';
import { Button, H1, Muted, Panel } from './ui';

export function ComingSoon({ title }: { title: string }) {
  return (
    <Screen>
      <Panel>
        <H1 style={{ fontSize: 28, marginBottom: 8 }}>{title}</H1>
        <Muted style={{ marginBottom: 18 }}>Deze pagina wordt nog gebouwd.</Muted>
        <Button title="Terug naar overzicht" variant="outline" onPress={() => router.navigate('/')} />
      </Panel>
    </Screen>
  );
}
