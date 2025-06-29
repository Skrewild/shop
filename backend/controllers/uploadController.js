const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

exports.uploadImage = async (req, res) => {
  if (!req.files || !req.files.image) {
    return res.status(400).json({ error: "No image file provided" });
  }
  const image = req.files.image;
  const ext = path.extname(image.name);
  const filename = uuidv4() + ext;
  const filepath = path.join(__dirname, '../products', filename);

  try {
    await image.mv(filepath);
    res.json({ success: true, location: `products/${filename}` });
  } catch (err) {
    res.status(500).json({ error: "Upload failed", detail: err.message });
  }
};
