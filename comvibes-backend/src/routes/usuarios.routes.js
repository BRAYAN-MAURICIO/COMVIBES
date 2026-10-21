const { Router } = require('express')
const ctrl = require('../controllers/usuarios.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { usuarios } = esquemas
const router = Router()

router.use(requireAuth)

// Rutas del propio usuario (cualquier rol autenticado)
router.put('/mi-perfil', validar({ body: usuarios.perfil }), ctrl.actualizarPerfil)
router.patch('/mi-perfil/password', validar({ body: usuarios.password }), ctrl.cambiarPassword)

// Gestión de usuarios — solo admin
router.get('/', requireAdmin, ctrl.listUsuarios)
router.get('/:id', requireAdmin, ctrl.getUsuario)
router.put('/:id', requireAdmin, validar({ body: usuarios.perfil }), ctrl.updateUsuario)
router.patch('/:id/rol', requireAdmin, validar({ body: usuarios.rol }), ctrl.cambiarRol)
router.patch('/:id/estado', requireAdmin, validar({ body: usuarios.estado }), ctrl.cambiarEstado)
router.delete('/:id', requireAdmin, ctrl.deleteUsuario)

module.exports = router
