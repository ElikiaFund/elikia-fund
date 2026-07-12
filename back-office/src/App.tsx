import { Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/app-layout'
import { ProtectedRoute } from '@/components/layout/protected-route'
import { AuthProvider } from '@/context/auth-context'
import { DashboardPage } from '@/pages/dashboard'
import { GroupsPage } from '@/pages/groups'
import { LoginPage } from '@/pages/login'
import { TransactionsPage } from '@/pages/transactions'
import { UsersPage } from '@/pages/users'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/utilisateurs" element={<UsersPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/tontines" element={<GroupsPage />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
