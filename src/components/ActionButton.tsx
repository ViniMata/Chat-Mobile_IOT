import { Pressable, StyleSheet, Text } from 'react-native';

export function ActionButton({ title, onPress, disabled = false }: { title: string; onPress: () => void; disabled?: boolean }): React.JSX.Element {
  const secondary = ['Sair', 'Atualizar', 'Todos', 'Recarregar usuários'].includes(title) || title.startsWith('@') || title.startsWith('Selecionar') || title.startsWith('Escolher');
  const danger = title === 'Remover';
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, danger && styles.danger, disabled && styles.disabled, pressed && styles.pressed]}><Text style={[styles.text, secondary && styles.secondaryText, danger && styles.dangerText]}>{title}</Text></Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 46, maxWidth: '100%', flexShrink: 1, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14, backgroundColor: '#0756d6', alignItems: 'center', justifyContent: 'center', marginVertical: 3 },
  text: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  secondary: { backgroundColor: '#008754', borderWidth: 1, borderColor: '#008754' }, secondaryText: { color: '#ffffff' },
  danger: { backgroundColor: '#fff0f0' }, dangerText: { color: '#aa3030' },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.8 },
});
