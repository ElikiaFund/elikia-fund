import { StyleSheet, Text, View } from 'react-native';

// MTN's real logomark is a complex illustrated icon we can't safely reproduce by hand — this
// uses MTN's actual brand yellow + wordmark styling instead of guessing at path data.
export function MtnLogo({ size = 40 }: { size?: number }) {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: size * 0.28 }]}>MTN</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FFCB05',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#000000',
    fontWeight: '900',
  },
});
