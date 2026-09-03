import { BrowserRouter, Routes, Route } from 'react-router-dom'

import ClientLayout from '../components/layout/ClientLayout'
import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from './ProtectedRoute'

// Cliente — públicas
import Home from '../pages/Home'
import ProductCatalog from '../pages/ProductCatalog'
import ProductDetail from '../pages/ProductDetail'
import Categories from '../pages/Categories'
import Login from '../pages/Login'
import Register from '../pages/Register'
import VerifyEmail from '../pages/VerifyEmail'
import ForgotPassword from '../pages/ForgotPassword'
import ResetPassword from '../pages/ResetPassword'
import Support from '../pages/Support'
import NotFound from '../pages/NotFound'

// Cliente — privadas
import ShoppingCart from '../pages/ShoppingCart'
import CheckoutFlow from '../pages/CheckoutFlow'
import UserProfile from '../pages/UserProfile'
import OrderHistory from '../pages/OrderHistory'
import Wishlist from '../pages/Wishlist'
import Invoice from '../pages/Invoice'

// Admin — todas privadas (requiredRole='admin')
import AdminDashboard from '../pages/admin/AdminDashboard'
import ProductManagement from '../pages/admin/ProductManagement'
import UserManagement from '../pages/admin/UserManagement'
import OrderManagement from '../pages/admin/OrderManagement'
import StockManagement from '../pages/admin/StockManagement'
import Reports from '../pages/admin/Reports'
import Settings from '../pages/admin/Settings'
import SupportManagement from '../pages/admin/SupportManagement'
import ProviderManagement from '../pages/admin/ProviderManagement'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ===================== CLIENTE ===================== */}
        <Route element={<ClientLayout />}>
          {/* Públicas */}
          <Route path='/' element={<Home />} />
          <Route path='/catalogo' element={<ProductCatalog />} />
          <Route path='/producto/:id' element={<ProductDetail />} />
          <Route path='/categorias' element={<Categories />} />
          <Route path='/soporte' element={<Support />} />
          <Route path='/login' element={<Login />} />
          <Route path='/registro' element={<Register />} />
          <Route path='/verificar-correo' element={<VerifyEmail />} />
          <Route path='/recuperar-contrasena' element={<ForgotPassword />} />
          <Route path='/restablecer-contrasena' element={<ResetPassword />} />

          {/* Privadas — requieren sesión, cualquier rol */}
          <Route path='/carrito' element={<ProtectedRoute><ShoppingCart /></ProtectedRoute>} />
          <Route path='/checkout' element={<ProtectedRoute><CheckoutFlow /></ProtectedRoute>} />
          <Route path='/perfil' element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path='/pedidos' element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path='/favoritos' element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
        </Route>

        {/* Factura — fuera del ClientLayout para que al imprimir no salga navbar/footer */}
        <Route path='/factura/:idPed' element={<ProtectedRoute><Invoice /></ProtectedRoute>} />

        {/* ===================== ADMIN ===================== */}
        <Route
          path='/admin'
          element={
            <ProtectedRoute requiredRole='admin'>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path='productos' element={<ProductManagement />} />
          <Route path='usuarios' element={<UserManagement />} />
          <Route path='pedidos' element={<OrderManagement />} />
          <Route path='inventario' element={<StockManagement />} />
          <Route path='reportes' element={<Reports />} />
          <Route path='soporte' element={<SupportManagement />} />
          <Route path='proveedores' element={<ProviderManagement />} />
          <Route path='configuracion' element={<Settings />} />
        </Route>

        {/* ===================== 404 ===================== */}
        <Route path='*' element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
