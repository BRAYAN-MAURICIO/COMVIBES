import { useState, useMemo, useEffect, useCallback } from 'react'
import { useToast } from '../../context/ToastContext'
import { Search } from 'lucide-react'
import ConfirmModal from '../../components/modals/ConfirmModal'
import * as usuariosApi from '../../api/usuarios'

function UserManagement() {
  const toast = useToast()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [blockTarget, setBlockTarget] = useState(null)
  const [search, setSearch] = useState('')

  const fetchUsuarios = useCallback(async () => {
    setLoading(true)
    try { setUsuarios(await usuariosApi.getUsuarios()) }
    catch (err) { toast.error('No se pudieron cargar los usuarios', err.message) }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchUsuarios() }, [fetchUsuarios])

  const filtered = useMemo(() => {
    if (!search.trim()) return usuarios
    const t = search.toLowerCase()
    return usuarios.filter(u =>
      `${u.nombre} ${u.apellido}`.toLowerCase().includes(t) || u.correo.toLowerCase().includes(t)
    )
  }, [usuarios, search])

  const handleRoleChange = async (idUsu, rol) => {
    try {
      const updated = await usuariosApi.cambiarRol(idUsu, rol)
      setUsuarios(prev => prev.map(u => u.idUsu === idUsu ? updated : u))
      toast.success('Rol actualizado')
    } catch (err) { toast.error('No se pudo actualizar el rol', err.message) }
  }

  const toggleEstado = async () => {
    const nuevoEstado = blockTarget.estado_cuenta === 'activo' ? 'bloqueado' : 'activo'
    try {
      const updated = await usuariosApi.cambiarEstado(blockTarget.idUsu, nuevoEstado)
      setUsuarios(prev => prev.map(u => u.idUsu === blockTarget.idUsu ? updated : u))
      toast.success(nuevoEstado === 'bloqueado' ? 'Usuario bloqueado' : 'Usuario reactivado')
    } catch (err) { toast.error('No se pudo actualizar el estado', err.message) }
    finally { setBlockTarget(null) }
  }

  const activos    = usuarios.filter(u => u.estado_cuenta === 'activo').length
  const bloqueados = usuarios.filter(u => u.estado_cuenta !== 'activo').length
  const admins     = usuarios.filter(u => u.rol === 'admin').length

  return (
    <div className='container-fluid py-4 px-4' style={{ maxWidth: 1280 }}>

      {/* Header gradient */}
      <div className='admin-page-header'>
        <h1 className='admin-page-header__title'>👥 Gestión de Usuarios</h1>
        <p className='admin-page-header__sub'>Administra los usuarios del sistema</p>
        <div className='admin-page-header__badges'>
          <span className='admin-badge'>✅ Activos: {activos}</span>
          <span className='admin-badge'>🔒 Bloqueados: {bloqueados}</span>
          <span className='admin-badge'>👑 Admins: {admins}</span>
        </div>
      </div>

      {/* Search */}
      <div className='mb-3' style={{ maxWidth: 320 }}>
        <div className='input-group'>
          <span className='input-group-text bg-white border-end-0'><Search size={15} className='text-muted' /></span>
          <input type='search' className='form-control border-start-0' placeholder='Buscar por nombre o correo...'
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className='admin-table-wrapper'>
        <table className='admin-table'>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Correo</th>
              <th style={{ textAlign:'center' }}>Rol</th>
              <th style={{ textAlign:'center' }}>Estado</th>
              <th style={{ textAlign:'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className='text-center text-muted py-4'>Cargando usuarios...</td></tr>
            )}
            {!loading && filtered.map(u => {
              const isBlocked = u.estado_cuenta !== 'activo'
              return (
                <tr key={u.idUsu} style={{ background: isBlocked ? '#fef2f2' : 'white', opacity: isBlocked ? 0.85 : 1 }}>
                  <td><span style={{ fontFamily:'monospace', fontWeight:600 }}>#{u.idUsu}</span></td>
                  <td>
                    <div className='d-flex align-items-center gap-2'>
                      <div className={`user-avatar-2 user-avatar-2--${isBlocked ? 'blocked' : 'active'}`}>
                        {(u.nombre||'?')[0]}{(u.apellido||'')[0]}
                      </div>
                      <div>
                        <p className='mb-0 small fw-semibold'>{u.nombre} {u.apellido}</p>
                        {isBlocked && <p className='mb-0' style={{ fontSize:'0.72rem', color:'#dc2626' }}>🔒 Bloqueado</p>}
                      </div>
                    </div>
                  </td>
                  <td style={{ color:'#6b7280' }}>{u.correo}</td>
                  <td style={{ textAlign:'center' }}>
                    <select
                      className={`role-select role-select--${u.rol}`}
                      value={u.rol}
                      onChange={e => handleRoleChange(u.idUsu, e.target.value)}
                    >
                      <option value='cliente'>👤 Cliente</option>
                      <option value='admin'>👑 Admin</option>
                    </select>
                  </td>
                  <td style={{ textAlign:'center' }}>
                    <span className={`status-badge status-badge--${isBlocked ? 'bloqueado' : 'activo'}`}>
                      {isBlocked ? '🔒 Bloqueado' : '✅ Activo'}
                    </span>
                  </td>
                  <td style={{ textAlign:'center' }}>
                    <button
                      className={`btn btn-sm ${isBlocked ? 'btn-outline-success' : 'btn-outline-danger'}`}
                      onClick={() => setBlockTarget(u)}
                    >
                      {isBlocked ? '🔓 Reactivar' : '🔒 Bloquear'}
                    </button>
                  </td>
                </tr>
              )
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className='text-center text-muted py-4'>Sin resultados para "{search}"</td></tr>
            )}
          </tbody>
        </table>

        {/* Footer stats */}
        <div className='admin-table-footer'>
          <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Total:</span><span className='admin-table-footer__value'>{usuarios.length}</span></div>
          <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Activos:</span><span className='admin-table-footer__value admin-table-footer__value--success'>{activos}</span></div>
          <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Bloqueados:</span><span className='admin-table-footer__value admin-table-footer__value--danger'>{bloqueados}</span></div>
          <div className='admin-table-footer__item'><span className='admin-table-footer__label'>Admins:</span><span className='admin-table-footer__value admin-table-footer__value--blue'>{admins}</span></div>
        </div>
      </div>

      <ConfirmModal
        show={Boolean(blockTarget)}
        title={blockTarget?.estado_cuenta === 'activo' ? '🔒 Bloquear usuario' : '🔓 Reactivar usuario'}
        message={`¿Confirmas ${blockTarget?.estado_cuenta === 'activo' ? 'bloquear' : 'reactivar'} a ${blockTarget?.nombre} ${blockTarget?.apellido}?`}
        confirmLabel={blockTarget?.estado_cuenta === 'activo' ? 'Bloquear' : 'Reactivar'}
        variant={blockTarget?.estado_cuenta === 'activo' ? 'danger' : 'success'}
        onConfirm={toggleEstado}
        onCancel={() => setBlockTarget(null)}
      />
    </div>
  )
}

export default UserManagement
