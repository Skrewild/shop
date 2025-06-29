const router = require('express').Router();
const { confirmOrder, getOrders, cancelOrder } = require('../controllers/orderController');

router.post('/confirm', confirmOrder);
router.get('/', getOrders);
router.post('/cancel', cancelOrder);

module.exports = router;
