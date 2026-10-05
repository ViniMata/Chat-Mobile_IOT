import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }): React.JSX.Element {
  const { width, height } = useWindowDimensions();
  const desktop = width >= 768;
  return <SafeAreaView style={styles.background}><KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={[style, styles.surface, { maxWidth: desktop ? 1040 : undefined, padding: width < 380 ? 12 : desktop ? 28 : 18, marginVertical: desktop && height > 550 ? 24 : 0, borderRadius: desktop ? 24 : 0 }]}>{children}</View></KeyboardAvoidingView></SafeAreaView>;
}
const styles = StyleSheet.create({ background: { flex: 1, backgroundColor: '#0746ad' }, fill: { flex: 1, minHeight: 0 }, surface: { flex: 1, minHeight: 0, width: '100%', alignSelf: 'center', backgroundColor: '#f3f8ff', borderTopWidth: 5, borderTopColor: '#00a86b' } });
