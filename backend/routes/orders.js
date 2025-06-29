const router = require('express').Router();
const { confirmSingleCart, getOrders, cancelOrder } = require('../controllers/orderController');

router.post('/confirm', confirmSingleCart);
router.get('/', getOrders);
router.post('/cancel', cancelOrder);

module.exports = router;
