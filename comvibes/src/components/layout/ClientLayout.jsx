import Navbar from './Navbar'
import Footer from './Footer'
import PageTransition from '../ui/PageTransition'

function ClientLayout() {
  return (
    <div className='main-container d-flex flex-column min-vh-100'>
      <a href='#main-content' className='visually-hidden-focusable btn btn-primary position-absolute m-2' style={{ zIndex: 2000 }}>
        Saltar al contenido
      </a>

      <Navbar />

      <main id='main-content' className='flex-grow-1'>
        <PageTransition />
      </main>

      <Footer />
    </div>
  )
}

export default ClientLayout
