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
    return bot.sendMessage(msg.chat.id, '⚠️ Подпись должна быть:\nДля добавления: Название; Цена\nДля редактирования: ID; Название; Цена');
  }

  const parts = caption.split(';').map(s => s.trim());

  if (parts.length === 2) {
    const [name, priceRaw] = parts;
    const price = parseFloat(priceRaw);
    if (!name || isNaN(price)) {
      return bot.sendMessage(msg.chat.id, '⚠️ Неверный формат. Пример: Шапка; 990');
    }
    return handleAddOrEdit({ msg, isEdit: false, name, price });
  }

  if (parts.length === 3) {
    const [idRaw, name, priceRaw] = parts;
    const id = parseInt(idRaw);
    const price = parseFloat(priceRaw);
    if (!id || !name || isNaN(price)) {
      return bot.sendMessage(msg.chat.id, '⚠️ Неверный формат. Пример: 12; Шапка; 990');
    }
    return handleAddOrEdit({ msg, isEdit: true, id, name, price });
  }

  return bot.sendMessage(msg.chat.id, '⚠️ Неверный формат подписи.');
});

async function handleAddOrEdit({ msg, isEdit, id, name, price }) {
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
        name, price, location
      }, {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      });

      if (updateRes.data.success) {
        return bot.sendMessage(msg.chat.id, `✏️ Товар ID ${id} успешно обновлён!`);
      } else {
        return bot.sendMessage(msg.chat.id, `⚠️ Ошибка обновления: ${updateRes.data.error}`);
      }
    } else {
      const addRes = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location });

      if (addRes.data.success) {
        return bot.sendMessage(msg.chat.id, `✅ Товар "${name}" успешно добавлен с изображением!`);
      } else {
        return bot.sendMessage(msg.chat.id, `⚠️ Ошибка при добавлении товара: ${addRes.data.error}`);
      }
    }

  } catch (err) {
    return bot.sendMessage(msg.chat.id, `❌ Ошибка загрузки: ${err.response?.data?.error || err.message}`);
  } finally {
    fs.unlink(filePath, () => {});
  }
}

bot.onText(/^\/start|\/help/, (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  bot.sendMessage(msg.chat.id, `
📦 Управление товарами:

📸 Чтобы ДОБАВИТЬ товар:
Отправь фото с подписью:
"Название; Цена"

Пример:
"Футболка; 2990"

✏️ Чтобы РЕДАКТИРОВАТЬ товар:
Сначала используй /edit, чтобы узнать ID товара.
Потом отправь фото с подписью:
"ID; Новое название; Новая цена"

Пример:
"12; Чёрная футболка; 4990"

Команды:
/edit — показать список товаров
/delete — показать и удалить товар
/orders — посмотреть заказы
/deleteorder <ID> — удалить заказ
/help — помощь
`.trim());
});

bot.onText(/^\/edit$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/products`);
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, '❗️ Нет товаров для редактирования.');
    const text = res.data.map(p => `ID: ${p.id}\nНазвание: ${p.name}\nЦена: $${p.price}\n---`).join('\n');
    bot.sendMessage(msg.chat.id, `Список товаров:\n\n${text}`);
  } catch {
    bot.sendMessage(msg.chat.id, '❌ Не удалось получить список товаров.');
  }
});

bot.onText(/^\/delete$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/products`);
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, '❗️ Нет товаров для удаления.');
    const text = res.data.map(p => `ID: ${p.id}\nНазвание: ${p.name}\nЦена: $${p.price}\n---`).join('\n');
    bot.sendMessage(msg.chat.id, `Список товаров:\n\n${text}\n\nЧтобы удалить, введи:\n/delete <ID>`);
  } catch {
    bot.sendMessage(msg.chat.id, '❌ Не удалось получить список товаров.');
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
      bot.sendMessage(msg.chat.id, `🗑️ Товар ID ${id} удалён!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Удаление не удалось.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка удаления:\n${err.response?.data?.error || err.message}`);
  }
});

bot.onText(/^\/orders$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/admin/orders`, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, 'Нет подтверждённых заказов.');
    const text = res.data.map(o =>
      `Order ID: ${o.id}\n` +
      `User: ${o.name}\nEmail: ${o.email}\nContact: ${o.contact}\nCity: ${o.city}\nAddress: ${o.address}\n` +
      `Product: ${o.product_name}\nPrice: $${o.price}\nTime: ${o.created_at?.slice(0,19).replace('T', ' ')}\n---`
    ).join('\n');
    bot.sendMessage(msg.chat.id, `Подтверждённые заказы:\n\n${text}\nЧтобы удалить: /deleteorder <ID>`);
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Не удалось получить заказы: ${err.response?.data?.error || err.message}`);
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
      bot.sendMessage(msg.chat.id, `🗑️ Заказ ID ${id} удалён!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Удаление не удалось.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка удаления:\n${err.response?.data?.error || err.message}`);
  }
});

module.exports = { notifyAdminOrder };
