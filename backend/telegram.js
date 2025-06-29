require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const https = require('https');
const path = require('path');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'https://shop-kw6q.onrender.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET;

async function notifyAdminOrder({ email, user = {}, items, total, orderId, cancelled = false }) {
  const info = `
${cancelled ? '❌ ORDER CANCELLED!' : '🛒 New order!'} ${orderId ? `№${orderId}` : ""}
👤 Name: ${user.name || "—"}
📧 Email: ${email}
☎️ Contact: ${user.contact || "—"}
🏙️ City: ${user.city || "—"}
🏠 Address: ${user.address || "—"}

${items.map(i => `• ${i.name} — $${i.price}`).join('\n')}
💵 Total: $${total}
  `.trim();

  await bot.sendMessage(ADMIN_CHAT_ID, info);
}

bot.on('photo', async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;

  const caption = msg.caption;
  if (!caption || !caption.includes(';')) {
    return bot.sendMessage(msg.chat.id, '⚠️ For addtion:\nTo add: Name; Price\nFor edit: ID; Name; Price');
  }

  const parts = caption.split(';').map(s => s.trim());

  if (parts.length === 3) {
    const [name, priceRaw, stockRaw] = parts;
    const price = parseFloat(priceRaw);
    const stock = parseInt(stockRaw, 10);
    if (!name || isNaN(price) || isNaN(stock)) {
      return bot.sendMessage(msg.chat.id, '⚠️ Incorrect format. Example: hat; 990; 7');
    }
    return handleAddOrEdit({ msg, isEdit: false, name, price, stock });
  }
  
  if (parts.length === 4) {
    const [idRaw, name, priceRaw, stockRaw] = parts;
    const id = parseInt(idRaw, 10);
    const price = parseFloat(priceRaw);
    const stock = parseInt(stockRaw, 10);
    if (!id || !name || isNaN(price) || isNaN(stock)) {
      return bot.sendMessage(msg.chat.id, '⚠️ ⚠️ Incorrect format. Example: 2, hat; 990; 7');
    }
    return handleAddOrEdit({ msg, isEdit: true, id, name, price, stock });
  }


  return bot.sendMessage(msg.chat.id, '⚠️ incorrect format.');
});

async function handleAddOrEdit({ msg, isEdit, id, name, price, stock }) {
  const fileId = msg.photo[msg.photo.length - 1].file_id;
  const file = await bot.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
  const fileExt = path.extname(file.file_path);
  const fileName = `${Date.now()}${fileExt}`;
  const filePath = `./temp/${fileName}`;

  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    https.get(fileUrl, (res) => {
      res.pipe(stream);
      stream.on('finish', () => stream.close(resolve));
    }).on('error', reject);
  });

  const form = new FormData();
  form.append('image', fs.createReadStream(filePath));

  try {
    const uploadRes = await axios.post(`${BACKEND_URL}/upload`, form, {
      headers: form.getHeaders()
    });

    const location = uploadRes.data.location;

    if (isEdit) {
      const updateRes = await axios.put(`${BACKEND_URL}/products/${id}`, {
        name, price, location, stock 
      }, {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      });

      if (updateRes.data.success) {
        return bot.sendMessage(msg.chat.id, `✏️ Товар ID ${id} успешно обновлён!`);
      } else {
        return bot.sendMessage(msg.chat.id, `⚠️ Update error: ${updateRes.data.error}`);
      }
    } else {
      const addRes = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location, stock });

      if (addRes.data.success) {
        return bot.sendMessage(msg.chat.id, `✅ Product "${name}" have been successfully added!`);
      } else {
        return bot.sendMessage(msg.chat.id, `⚠️ Error: ${addRes.data.error}`);
      }
    }

  } catch (err) {
    return bot.sendMessage(msg.chat.id, `❌ Upload error: ${err.response?.data?.error || err.message}`);
  } finally {
    fs.unlink(filePath, () => {});
  }
}


bot.onText(/^\/start|\/help/, (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  bot.sendMessage(msg.chat.id, `
📦 Product management:

📸 To ADD a product:
Send a photo with caption:
"Name; Price; Stock"
Example:
"T-shirt; 2990; 7"

✏️ To EDIT a product:
First use /edit to see the product ID.
Then send a photo with caption:
"ID; New name; New price; New stock"
Example:
"12; Black T-shirt; 4990; 3"

Commands:
/edit — Show list of products
/delete — Show and delete product
/orders — Show confirmed orders
/deleteorder <ID> — Delete an order
/waiting — Show pending orders
/approve <ID> — Approve pending order
/help — Show this help
`.trim());
});


bot.onText(/^\/edit$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/products`);
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, '❗️ No products available for editing.');
    const text = res.data.map(p => 
      `ID: ${p.id}\nName: ${p.name}\nPrice: $${p.price}\nStock: ${p.stock}\n---`
    ).join('\n');
    bot.sendMessage(msg.chat.id, `Product list:\n\n${text}`);
  } catch {
    bot.sendMessage(msg.chat.id, '❌ Failed to get product list.');
  }
});

bot.onText(/^\/delete$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/products`);
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, '❗️ No products available for deletion.');
    const text = res.data.map(p => 
      `ID: ${p.id}\nName: ${p.name}\nPrice: $${p.price}\nStock: ${p.stock}\n---`
    ).join('\n');
    bot.sendMessage(
      msg.chat.id,
      `Product list:\n\n${text}\n\nTo delete a product, type:\n/delete <ID>`
    );
  } catch {
    bot.sendMessage(msg.chat.id, '❌ Failed to get product list.');
  }
});


bot.onText(/^\/delete (\d+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const id = match[1].trim();
  try {
    const res = await axios.delete(`${BACKEND_URL}/products/${id}`, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `🗑️ Product ID ${id} deleted!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Error: ${res.data.error || 'Deletion failed.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error of deletion:\n${err.response?.data?.error || err.message}`);
  }
});

bot.onText(/^\/orders$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/admin/orders`, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, 'No confirmed orders.');
    const text = res.data.map(o =>
      `Order ID: ${o.id}\n` +
      `User: ${o.name}\nEmail: ${o.email}\nContact: ${o.contact}\nCity: ${o.city}\nAddress: ${o.address}\n` +
      `Product: ${o.product_name}\nPrice: $${o.price}\nTime: ${o.created_at?.slice(0,19).replace('T', ' ')}\n---`
    ).join('\n');
    bot.sendMessage(msg.chat.id, `Confirmed orders:\n\n${text}\nTo delete: /deleteorder <ID>`);
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Failed to order: ${err.response?.data?.error || err.message}`);
  }
});

bot.onText(/^\/deleteorder (\d+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const id = match[1].trim();
  try {
    const res = await axios.delete(`${BACKEND_URL}/admin/orders/${id}`, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `🗑️ Order ID ${id} deleted!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Error: ${res.data.error || 'Deletion faile.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error to deletion:\n${err.response?.data?.error || err.message}`);
  }
});

bot.onText(/^\/waiting$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/admin/orders/waiting`, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, 'Нет ожидающих подтверждения заказов.');
    const text = res.data.map(o =>
      `Order ID: ${o.id}\n` +
      `User: ${o.name}\nEmail: ${o.email}\nContact: ${o.contact}\nCity: ${o.city}\nAddress: ${o.address}\n` +
      `Product: ${o.product_name}\nPrice: $${o.price}\nTime: ${o.created_at?.slice(0,19).replace('T', ' ')}\n---`
    ).join('\n');
    bot.sendMessage(msg.chat.id, `Waiting orders:\n\n${text}\nTo approve: /approve <ID>`);
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Failed to receive order: ${err.response?.data?.error || err.message}`);
  }
});

bot.onText(/^\/approve (\d+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const id = match[1].trim();
  try {
    const res = await axios.post(`${BACKEND_URL}/admin/orders/confirm/${id}`, {}, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `✅ Order ID ${id} confirmed!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Error: ${res.data.error || 'Approvement failed.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Approvement error:\n${err.response?.data?.error || err.message}`);
  }
});


module.exports = { notifyAdminOrder };
