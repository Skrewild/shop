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
    return bot.sendMessage(msg.chat.id, '⚠️ Подпись должна быть в формате: Название; Цена');
  }

  const [name, priceRaw] = caption.split(';').map(s => s.trim());
  const price = parseFloat(priceRaw);
  if (!name || isNaN(price)) {
    return bot.sendMessage(msg.chat.id, '⚠️ Неверный формат подписи. Пример: Кепка; 990');
  }

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
      stream.on('finish', () => {
        stream.close(resolve);
      });
    }).on('error', reject);
  });

  const form = new FormData();
  form.append('image', fs.createReadStream(filePath));

  try {
    const uploadRes = await axios.post(`${BACKEND_URL}/upload`, form, {
      headers: form.getHeaders()
    });

    const location = uploadRes.data.location;

    const addRes = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location });

    if (addRes.data.success) {
      bot.sendMessage(msg.chat.id, `✅ Товар "${name}" успешно добавлен с изображением!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка при добавлении товара: ${addRes.data.error}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка загрузки: ${err.response?.data?.error || err.message}`);
  } finally {
    fs.unlink(filePath, () => {}); // удалить временный файл
  }
});

// 💬 Команды (без изменений)
bot.onText(/^\/start|\/help/, (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  bot.sendMessage(msg.chat.id, `
Available commands:
/edit — edit a product
/delete — delete a product
/orders — view all confirmed orders
/deleteorder <ID> — delete an order by its ID
/help — show this help

📸 To add a product with photo, just send a product photo with caption:
Name; Price

Example: (photo) T-Shirt; 2990"
  `.trim());
});

bot.onText(/^\/edit$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(${BACKEND_URL}/products);
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, '❗️ No products to edit.');
    const text = res.data.map(p => ID: ${p.id}\nName: ${p.name}\nPrice: $${p.price}\nImage: ${p.location}\n---).join('\n');
    bot.sendMessage(msg.chat.id, Products for editing:\n\n${text}\n\nNow send:\n/edit <ID>; <new name>; <new price>; <products/file.jpg>);
  } catch {
    bot.sendMessage(msg.chat.id, '❌ Could not fetch products.');
  }
});

bot.onText(/^\/edit (\d+);([^;]+);([^;]+);(.+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const id = match[1].trim();
  const name = match[2].trim();
  const price = match[3].trim();
  const location = match[4].trim();
  try {
    const res = await axios.put(${BACKEND_URL}/products/${id}, { name, price, location }, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, ✏️ Product ID ${id} updated!);
    } else {
      bot.sendMessage(msg.chat.id, ⚠️ Error: ${res.data.error || 'Update failed.'});
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, ❌ Update error:\n${err.response?.data?.error || err.message});
  }
});

bot.onText(/^\/delete$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(${BACKEND_URL}/products);
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, '❗️ No products to delete.');
    const text = res.data.map(p => ID: ${p.id}\nName: ${p.name}\nPrice: $${p.price}\nImage: ${p.location}\n---).join('\n');
    bot.sendMessage(msg.chat.id, Products for deletion:\n\n${text}\n\nNow send:\n/delete <ID>);
  } catch {
    bot.sendMessage(msg.chat.id, '❌ Could not fetch products.');
  }
});

bot.onText(/^\/delete (\d+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const id = match[1].trim();
  try {
    const res = await axios.delete(${BACKEND_URL}/products/${id}, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, 🗑️ Product ID ${id} deleted!);
    } else {
      bot.sendMessage(msg.chat.id, ⚠️ Error: ${res.data.error || 'Delete failed.'});
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, ❌ Delete error:\n${err.response?.data?.error || err.message});
  }
});

bot.onText(/^\/orders$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(${BACKEND_URL}/admin/orders, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, 'No confirmed orders.');
    const text = res.data.map(o =>
      Order ID: ${o.id}\n +
      User: ${o.name}\nEmail: ${o.email}\nContact: ${o.contact}\nCity: ${o.city}\nAddress: ${o.address}\n +
      Product: ${o.item_name}\nPrice: $${o.price}\nTime: ${o.created_at?.slice(0,19).replace('T', ' ')}\n---
    ).join('\n');
    bot.sendMessage(msg.chat.id, Confirmed Orders:\n\n${text}\nTo delete: /deleteorder <ID>);
  } catch (err) {
    bot.sendMessage(msg.chat.id, ❌ Could not fetch orders: ${err.response?.data?.error || err.message});
  }
});

bot.onText(/^\/deleteorder (\d+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const id = match[1].trim();
  try {
    const res = await axios.delete(${BACKEND_URL}/admin/orders/${id}, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, 🗑️ Order ID ${id} deleted!);
    } else {
      bot.sendMessage(msg.chat.id, ⚠️ Error: ${res.data.error || 'Delete failed.'});
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, ❌ Delete error:\n${err.response?.data?.error || err.message});
  }
});

module.exports = { notifyAdminOrder };
module.exports = { notifyAdminOrder };
