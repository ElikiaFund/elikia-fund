import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { useCompany } from '@/context/company-context';

type VaultContextValue = {
  isUnlocked: boolean;
  unlock: () => void;
  lock: () => void;
};

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: PropsWithChildren) {
  const { activeCompany } = useCompany();
  // The vault is per-company now — track which company was unlocked, not a plain boolean, so
  // switching companies (even without a full app restart) always re-locks instead of carrying an
  // unlock over to a different company's vault.
  const [unlockedCompanyId, setUnlockedCompanyId] = useState<number | null>(null);

  useEffect(() => {
    setUnlockedCompanyId(null);
  }, [activeCompany?.id]);

  return (
    <VaultContext.Provider
      value={{
        isUnlocked: unlockedCompanyId !== null && unlockedCompanyId === activeCompany?.id,
        unlock: () => setUnlockedCompanyId(activeCompany?.id ?? null),
        lock: () => setUnlockedCompanyId(null),
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
