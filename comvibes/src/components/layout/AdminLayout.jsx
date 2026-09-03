import SidebarAdmin from './SidebarAdmin'
import PageTransition from '../ui/PageTransition'

function AdminLayout() {
  return (
    <div className='d-flex'>
      <SidebarAdmin />

      <div className='flex-grow-1' style={{ minWidth: 0 }}>
        <PageTransition />
      </div>
    </div>
  )
}

export default AdminLayout
