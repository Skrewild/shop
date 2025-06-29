const router = require('express').Router();
const { uploadFile } = require('../controllers/uploadController');

router.post('/', uploadFile);

module.exports = router;
