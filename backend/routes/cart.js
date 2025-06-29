const router = require('express').Router();
const { getCart, addToCart, removeFromCart, confirmCart } = require('../controllers/cartController');

router.get('/', getCart);
router.post('/', addToCart);
router.delete('/:id', removeFromCart);
router.post('/confirm', confirmCart);
module.exports = router;
