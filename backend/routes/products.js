const router = require('express').Router();
const { getAll } = require('../controllers/productController');

router.get('/', getAll);

module.exports = router;
