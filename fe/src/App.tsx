import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { ScrollToTop } from '@/components/routing/ScrollToTop'
import CartPage from '@/pages/CartPage'
import CartPreviewPage from '@/pages/CartPreviewPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/cart" element={<CartPage />} />
        <Route path="/cart/preview" element={<CartPreviewPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
