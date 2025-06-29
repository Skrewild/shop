const router = require('express').Router();
const { uploadFile } = require('../controllers/uploadController');

router.post('/', uploadImage);

module.exports = router;
