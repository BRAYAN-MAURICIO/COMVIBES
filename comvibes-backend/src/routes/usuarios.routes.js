const { Router } = require('express')
const ctrl = require('../controllers/usuarios.controller')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = Router()

router.use(requireAuth)

// Rutas del propio usuario (cualquier rol autenticado)
router.put('/mi-perfil', ctrl.actualizarPerfil)
router.patch('/mi-perfil/password', ctrl.cambiarPassword)

// Gestión de usuarios — solo admin
router.get('/', requireAdmin, ctrl.listUsuarios)
router.get('/:id', requireAdmin, ctrl.getUsuario)
router.put('/:id', requireAdmin, ctrl.updateUsuario)
router.patch('/:id/rol', requireAdmin, ctrl.cambiarRol)
router.patch('/:id/estado', requireAdmin, ctrl.cambiarEstado)
router.delete('/:id', requireAdmin, ctrl.deleteUsuario)

module.exports = router
