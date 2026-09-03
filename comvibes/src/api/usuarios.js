import { api } from './client'

export const getUsuarios = () => api.get('/usuarios')

export const getUsuario = (idUsu) => api.get(`/usuarios/${idUsu}`)

export const updateUsuario = (idUsu, payload) => api.put(`/usuarios/${idUsu}`, payload)

export const cambiarRol = (idUsu, rol) => api.patch(`/usuarios/${idUsu}/rol`, { rol })

export const cambiarEstado = (idUsu, estado) => api.patch(`/usuarios/${idUsu}/estado`, { estado })

export const deleteUsuario = (idUsu) => api.delete(`/usuarios/${idUsu}`)

// Perfil propio (cualquier usuario autenticado)
export const actualizarPerfil = (payload) => api.put('/usuarios/mi-perfil', payload)

export const cambiarPassword = (passwordActual, passwordNueva) =>
  api.patch('/usuarios/mi-perfil/password', { passwordActual, passwordNueva })
