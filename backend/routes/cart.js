const router = require('express').Router();
const auth = require('../middleware/auth');
const { addToCart, getCart, removeFromCart, confirmOrder } = require('../controllers/cartController');

router.post('/add', auth, addToCart);
router.get('/', auth, getCart);
router.post('/remove', auth, removeFromCart);
router.post('/confirm', auth, confirmOrder);

module.exports = router;
