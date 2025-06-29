const router = require('express').Router();
const { uploadImage } = require('../controllers/uploadController');

router.post('/', uploadImage);

module.exports = router;
