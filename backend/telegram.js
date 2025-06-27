require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'https://shop-kw6q.onrender.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// --- Уведомление о заказах и отменах ---
async function notifyAdminOrder({ email, user = {}, items, total, orderId, cancelled = false }) {
  const info = `
${cancelled ? '❌ ОТМЕНА заказа!' : '🛒 Новый заказ!'} ${orderId ? `№${orderId}` : ""}
👤 Name: ${user.name || "—"}
📧 Email: ${email}
☎️ Contact: ${user.contact || "—"}
🏙️ City: ${user.city || "—"}
🏠 Address: ${user.address || "—"}

${items.map(i => `• ${i.name} — $${i.price}`).join('\n')}
💵 Result: $${total}
  `.trim();

  await bot.sendMessage(ADMIN_CHAT_ID, info);
}

// --- HELP ---
bot.onText(/^\/start|\/help/, (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  bot.sendMessage(msg.chat.id, `
Доступные команды:
/addproduct <название>; <цена>; <products/файл.jpg>
/edit — редактировать товар
/delete — удалить товар
/help — подсказка

Для /edit и /delete: бот покажет список с ID, после чего ты отправляешь команду:
/edit <ID>; <новое название>; <новая цена>; <products/файл.jpg>
/delete <ID>
  `.trim());
});

// --- ДОБАВЛЕНИЕ ТОВАРА ---
bot.onText(/^\/addproduct (.+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const args = match[1].split(';').map(s => s.trim());
  if (args.length < 3) {
    return bot.sendMessage(msg.chat.id, '⚠️ Формат: /addproduct Название; Цена; products/файл.jpg');
  }
  const [name, price, location] = args;
  try {
    const res = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `✅ Товар "${name}" добавлен!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось добавить товар.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка при добавлении: ${err.response?.data?.error || err.message}`);
  }
});

// --- СПИСОК ДЛЯ РЕДАКТИРОВАНИЯ ---
bot.onText(/^\/edit$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/products`);
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, '❗️ Нет товаров для редактирования.');
    const text = res.data.map(p => `ID: ${p.id}\nНазвание: ${p.name}\nЦена: $${p.price}\nКартинка: ${p.location}\n---`).join('\n');
    bot.sendMessage(msg.chat.id, `Список товаров для редактирования:\n\n${text}\n\nТеперь отправь:\n/edit <ID>; <новое название>; <новая цена>; <products/файл.jpg>`);
  } catch {
    bot.sendMessage(msg.chat.id, '❌ Ошибка получения списка товаров.');
  }
});

// --- РЕДАКТИРОВАТЬ ТОВАР ---
bot.onText(/^\/edit (\d+);([^;]+);([^;]+);(.+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const id = match[1].trim();
  const name = match[2].trim();
  const price = match[3].trim();
  const location = match[4].trim();
  try {
    const res = await axios.put(`${BACKEND_URL}/products/${id}`, { name, price, location }, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `✏️ Товар ID ${id} успешно обновлён!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось обновить.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка при обновлении:\n${err.response?.data?.error || err.message}`);
  }
});

// --- СПИСОК ДЛЯ УДАЛЕНИЯ ---
bot.onText(/^\/delete$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  try {
    const res = await axios.get(`${BACKEND_URL}/products`);
    if (!Array.isArray(res.data) || !res.data.length)
      return bot.sendMessage(msg.chat.id, '❗️ Нет товаров для удаления.');
    const text = res.data.map(p => `ID: ${p.id}\nНазвание: ${p.name}\nЦена: $${p.price}\nКартинка: ${p.location}\n---`).join('\n');
    bot.sendMessage(msg.chat.id, `Список товаров для удаления:\n\n${text}\n\nТеперь отправь:\n/delete <ID>`);
  } catch {
    bot.sendMessage(msg.chat.id, '❌ Ошибка получения списка товаров.');
  }
});

// --- УДАЛИТЬ ТОВАР ---
bot.onText(/^\/delete (\d+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;
  const id = match[1].trim();
  try {
    const res = await axios.delete(`${BACKEND_URL}/products/${id}`, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `🗑️ Товар ID ${id} успешно удалён!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось удалить.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка при удалении:\n${err.response?.data?.error || err.message}`);
  }
});

module.exports = { notifyAdminOrder };
