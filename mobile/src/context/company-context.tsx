import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';
import { backfillLegacyIds } from '@/db/database';
import { setApiActiveCompanyId } from '@/services/apiService';
import type { Company } from '@/services/authService';
import { companyService } from '@/services/companyService';

const ACTIVE_COMPANY_KEY = 'elikia_fund_active_company_id';
// Last known-good list, refreshed on every successful GET /companies — lets the app keep
// showing a usable switcher when it can't reach the API (mirrors CACHED_USER_KEY in auth-context).
const CACHED_COMPANIES_KEY = 'elikia_fund_cached_companies';

type CompanyContextValue = {
  companies: Company[];
  activeCompany: Company | null;
  isLoading: boolean;
  selectCompany: (companyId: number) => Promise<void>;
  refreshCompanies: () => Promise<void>;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: PropsWithChildren) {
  const { isAuthenticated, user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setCompanies([]);
      setActiveCompany(null);
      setApiActiveCompanyId(null);
      setIsLoading(false);
      SecureStore.deleteItemAsync(ACTIVE_COMPANY_KEY).catch(() => {});
      SecureStore.deleteItemAsync(CACHED_COMPANIES_KEY).catch(() => {});
      return;
    }

    setIsLoading(true);
    refreshCompanies().finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  // A one-time local backfill for data written before multi-company support existed — safe to
  // re-run (it's a no-op once every local row already has a company_id), fires whenever the
  // active company is (re)resolved rather than at login time, since no company is known yet then.
  useEffect(() => {
    if (user && activeCompany) {
      backfillLegacyIds(user.id, activeCompany.id).catch(() => {});
    }
  }, [user, activeCompany]);

  async function cacheCompanies(list: Company[]) {
    await SecureStore.setItemAsync(CACHED_COMPANIES_KEY, JSON.stringify(list)).catch(() => {});
  }

  async function resolveActiveCompany(list: Company[]) {
    const storedId = await SecureStore.getItemAsync(ACTIVE_COMPANY_KEY);
    const resolved = (storedId ? list.find((c) => c.id === Number(storedId)) : undefined) ?? list[0] ?? null;

    setActiveCompany(resolved);
    setApiActiveCompanyId(resolved?.id ?? null);

    if (resolved) {
      await SecureStore.setItemAsync(ACTIVE_COMPANY_KEY, String(resolved.id)).catch(() => {});
    }
  }

  async function refreshCompanies() {
    try {
      const fetched = await companyService.list();
      setCompanies(fetched);
      await cacheCompanies(fetched);
      await resolveActiveCompany(fetched);
    } catch {
      // Offline/failed — fall back to the last cached list so the switcher stays usable.
      const cached = await SecureStore.getItemAsync(CACHED_COMPANIES_KEY);

      if (cached) {
        try {
          const parsed = JSON.parse(cached) as Company[];
          setCompanies(parsed);
          await resolveActiveCompany(parsed);
        } catch {
          // Corrupted cache — nothing to restore from.
        }
      }
    }
  }

  async function selectCompany(companyId: number) {
    const company = companies.find((c) => c.id === companyId) ?? null;

    setActiveCompany(company);
    setApiActiveCompanyId(company?.id ?? null);
    await SecureStore.setItemAsync(ACTIVE_COMPANY_KEY, String(companyId)).catch(() => {});
  }

  return (
    <CompanyContext.Provider value={{ companies, activeCompany, isLoading, selectCompany, refreshCompanies }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);

  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }

  return context;
}
