import AppRoutes from './routes/AppRoutes'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { WishlistProvider } from './context/WishlistContext'
import { SupportProvider } from './context/SupportContext'
import { ProductsProvider } from './context/ProductsContext'
import { CategoriesProvider } from './context/CategoriesContext'
import { MetodosPagoProvider } from './context/MetodosPagoContext'
import { OrdersProvider } from './context/OrdersContext'
import { ReviewsProvider } from './context/ReviewsContext'
import { AddressesProvider } from './context/AddressesContext'
import { FacturasProvider } from './context/FacturasContext'
import { NotificationsProvider } from './context/NotificationsContext'
import { EnviosProvider } from './context/EnviosContext'
import { ProvidersProvider } from './context/ProvidersContext'
import { PagosProvider } from './context/PagosContext'
import { ToastProvider } from './context/ToastContext'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProductsProvider>
          <CategoriesProvider>
            <MetodosPagoProvider>
              <ToastProvider>
                <OrdersProvider>
                  <ReviewsProvider>
                    <AddressesProvider>
                      <FacturasProvider>
                        <NotificationsProvider>
                          <EnviosProvider>
                            <ProvidersProvider>
                              <PagosProvider>
                                <CartProvider>
                                  <WishlistProvider>
                                    <SupportProvider>
                                      <AppRoutes />
                                    </SupportProvider>
                                  </WishlistProvider>
                                </CartProvider>
                              </PagosProvider>
                            </ProvidersProvider>
                          </EnviosProvider>
                        </NotificationsProvider>
                      </FacturasProvider>
                    </AddressesProvider>
                  </ReviewsProvider>
                </OrdersProvider>
              </ToastProvider>
            </MetodosPagoProvider>
          </CategoriesProvider>
        </ProductsProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
