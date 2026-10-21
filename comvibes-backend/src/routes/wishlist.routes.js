const { Router } = require('express')
const ctrl = require('../controllers/wishlist.controller')
const { requireAuth } = require('../middleware/auth')

const { validar } = require('../middleware/validar')
const esquemas = require('../validation/esquemas')

const { wishlist } = esquemas
const router = Router()

router.use(requireAuth)

router.get('/', ctrl.getWishlist)
router.post('/', validar({ body: wishlist.toggle }), ctrl.toggleWishlist)
router.delete('/:idPro', ctrl.removeFromWishlist)

module.exports = router
