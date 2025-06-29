const router = require('express').Router();
const { confirmOrder, getOrders, cancelOrder, exportOrders } = require('../controllers/orderController');

router.post('/confirm', confirmOrder);
router.get('/', getOrders);
router.post('/cancel', cancelOrder);
router.get('/export', exportOrders);

module.exports = router;
