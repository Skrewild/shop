const router = require('express').Router();
const {
  confirmSingleCart,
  confirmOrder,
  getOrders,
  cancelOrder
} = require('../controllers/orderController');

router.post('/cart/confirm', confirmSingleCart);
router.post('/confirm', confirmOrder);           
router.get('/', getOrders);                   
router.post('/cancel', cancelOrder);        

module.exports = router;
