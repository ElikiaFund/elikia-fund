import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/auth-context'
import { CompaniesPage } from '@/pages/companies'
import { CompanyDetailPage } from '@/pages/company-detail'
import { DashboardPage } from '@/pages/dashboard'
import { GroupDetailPage } from '@/pages/group-detail'
import { GroupsPage } from '@/pages/groups'
import { LoginPage } from '@/pages/login'
import { PersonnelPage } from '@/pages/personnel'
import { ProfilePage } from '@/pages/profile'
import { SettingsPage } from '@/pages/settings'
import { TransactionsPage } from '@/pages/transactions'
import { UserDetailPage } from '@/pages/user-detail'
import { UsersPage } from '@/pages/users'

function App() {
  return (
    <AuthProvider>
      <Toaster />
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/utilisateurs" element={<UsersPage />} />
            <Route path="/utilisateurs/:id" element={<UserDetailPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/tontines" element={<GroupsPage />} />
            <Route path="/tontines/:id" element={<GroupDetailPage />} />
            <Route path="/entreprises" element={<CompaniesPage />} />
            <Route path="/entreprises/:id" element={<CompanyDetailPage />} />
            <Route path="/personnel" element={<PersonnelPage />} />
            <Route path="/parametres" element={<SettingsPage />} />
            <Route path="/profil" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
