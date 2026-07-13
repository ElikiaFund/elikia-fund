import { SymbolView } from 'expo-symbols';

export function AppleLogo({ size = 20, color }: { size?: number; color: string }) {
  return <SymbolView name="apple.logo" size={size} tintColor={color} resizeMode="scaleAspectFit" />;
}
