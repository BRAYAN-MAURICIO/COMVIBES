const { Router } = require('express')
const ctrl = require('../controllers/wishlist.controller')
const { requireAuth } = require('../middleware/auth')

const router = Router()

router.use(requireAuth)

router.get('/', ctrl.getWishlist)
router.post('/', ctrl.toggleWishlist)
router.delete('/:idPro', ctrl.removeFromWishlist)

module.exports = router
