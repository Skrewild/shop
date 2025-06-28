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

// 📸 Добавление товара через фото и подпись
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

  // Скачать файл
  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(filePath);
    https.get(fileUrl, (res) => {
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close(resolve);
      });
    }).on('error', reject);
  });

  // Отправить файл на сервер
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


// остальные команды остаются без изменений:
bot.onText(/^\/addproduct (.+)/, async (msg, match) => { /* как у тебя */ });
bot.onText(/^\/edit$/, async (msg) => { /* как у тебя */ });
bot.onText(/^\/edit (\d+);([^;]+);([^;]+);(.+)/, async (msg, match) => { /* как у тебя */ });
bot.onText(/^\/delete$/, async (msg) => { /* как у тебя */ });
bot.onText(/^\/delete (\d+)/, async (msg, match) => { /* как у тебя */ });
bot.onText(/^\/orders$/, async (msg) => { /* как у тебя */ });
bot.onText(/^\/deleteorder (\d+)/, async (msg, match) => { /* как у тебя */ });

module.exports = { notifyAdminOrder };
