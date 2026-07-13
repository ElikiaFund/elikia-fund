import { StyleSheet, Text, View } from 'react-native';

// Same approach as MtnLogo — Airtel's real logomark is a hand-drawn swoosh we can't safely
// reproduce by hand, so this uses Airtel's actual brand red + wordmark styling instead.
export function AirtelLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.22 }]}>airtel</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#ED1D24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontStyle: 'italic',
  },
});
