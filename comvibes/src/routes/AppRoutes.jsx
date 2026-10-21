import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

import ClientLayout from '../components/layout/ClientLayout'
import AdminLayout from '../components/layout/AdminLayout'
import ProtectedRoute from './ProtectedRoute'

// Home se carga de inmediato: es la primera página que ve casi todo el mundo.
import Home from '../pages/Home'

// El resto se carga bajo demanda (auditoría ISO, H10). Antes todo salía en
// un solo archivo de ~1 MB: un cliente descargaba también el panel admin,
// los gráficos de Reportes (recharts) y cada formulario. Con React.lazy cada
// página es un archivo aparte que se pide la primera vez que se visita.

// Cliente — públicas
const ProductCatalog = lazy(() => import('../pages/ProductCatalog'))
const ProductDetail = lazy(() => import('../pages/ProductDetail'))
const Categories = lazy(() => import('../pages/Categories'))
const Login = lazy(() => import('../pages/Login'))
const Register = lazy(() => import('../pages/Register'))
const VerifyEmail = lazy(() => import('../pages/VerifyEmail'))
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'))
const ResetPassword = lazy(() => import('../pages/ResetPassword'))
const Support = lazy(() => import('../pages/Support'))
const NotFound = lazy(() => import('../pages/NotFound'))

// Cliente — privadas
const ShoppingCart = lazy(() => import('../pages/ShoppingCart'))
const CheckoutFlow = lazy(() => import('../pages/CheckoutFlow'))
const UserProfile = lazy(() => import('../pages/UserProfile'))
const OrderHistory = lazy(() => import('../pages/OrderHistory'))
const Wishlist = lazy(() => import('../pages/Wishlist'))
const Invoice = lazy(() => import('../pages/Invoice'))

// Admin — todas privadas (requiredRole='admin')
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'))
const ProductManagement = lazy(() => import('../pages/admin/ProductManagement'))
const UserManagement = lazy(() => import('../pages/admin/UserManagement'))
const OrderManagement = lazy(() => import('../pages/admin/OrderManagement'))
const StockManagement = lazy(() => import('../pages/admin/StockManagement'))
const Reports = lazy(() => import('../pages/admin/Reports'))
const Settings = lazy(() => import('../pages/admin/Settings'))
const SupportManagement = lazy(() => import('../pages/admin/SupportManagement'))
const ProviderManagement = lazy(() => import('../pages/admin/ProviderManagement'))
const AuditLog = lazy(() => import('../pages/admin/AuditLog'))

function AppRoutes() {
  return (
    <BrowserRouter>
      {/* Respaldo para las rutas fuera de los layouts (factura y 404); las
          demás muestran su indicador dentro del layout (PageTransition). */}
      <Suspense fallback={null}>
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
          <Route path='auditoria' element={<AuditLog />} />
        </Route>

        {/* ===================== 404 ===================== */}
        <Route path='*' element={<NotFound />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default AppRoutes
