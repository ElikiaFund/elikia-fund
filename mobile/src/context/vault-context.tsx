import { createContext, useContext, useState, type PropsWithChildren } from 'react';

type VaultContextValue = {
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: PropsWithChildren) {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <VaultContext.Provider
      value={{
        isUnlocked,
        unlock: () => setIsUnlocked(true),
        lock: () => setIsUnlocked(false),
      }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);

  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }

  return context;
}
