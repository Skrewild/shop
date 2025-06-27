require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'https://shop-kw6q.onrender.com';

const helpText = `
Доступные команды:
• /addproduct Название; Цена; products/файл.jpg — добавить товар
• /edit — список товаров и инструкция по редактированию
• /editproduct ID; Новое название; Новая цена; Новый путь — редактировать товар
• /delete — список товаров и инструкция по удалению
• /deleteproduct ID — удалить товар

Пример: /addproduct Куртка; 99.99; products/jacket.jpg
Пример: /editproduct 3; Новая куртка; 199.99; products/new.jpg
Пример: /deleteproduct 4
`;

bot.onText(/^\/(help|start)/, (msg) => {
  bot.sendMessage(msg.chat.id, helpText);
});

bot.onText(/^\/addproduct (.+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) {
    return bot.sendMessage(msg.chat.id, '⛔️ Только админ может добавлять товары!');
  }
  const args = match[1].split(';').map(s => s.trim());
  if (args.length < 3) {
    return bot.sendMessage(msg.chat.id, '⚠️ Формат: /addproduct Название; Цена; products/файл.jpg');
  }
  const [name, price, location] = args;
  try {
    const res = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `✅ Товар "${name}" успешно добавлен!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось добавить товар.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка при добавлении товара:\n${err.response?.data?.error || err.message}`);
  }
});

bot.onText(/^\/edit$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) {
    return bot.sendMessage(msg.chat.id, '⛔️ Только админ может редактировать товары!');
  }
  try {
    const res = await axios.get(`${BACKEND_URL}/products`);
    const products = res.data;
    if (!products.length) return bot.sendMessage(msg.chat.id, "Нет товаров для редактирования.");
    let txt = `Товары:\n`;
    txt += products.map(p =>
      `ID: ${p.id}\nНазвание: ${p.name}\nЦена: $${p.price}\nФото: ${p.location}\n---`
    ).join('\n');
    txt += `\nИспользуй: /editproduct ID; Новое название; Новая цена; Новый путь\nПример: /editproduct 2; Джоггеры; 79.99; products/jogger.png`;
    bot.sendMessage(msg.chat.id, txt);
  } catch (err) {
    bot.sendMessage(msg.chat.id, "Ошибка при получении товаров.");
  }
});

bot.onText(/^\/editproduct (.+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) {
    return bot.sendMessage(msg.chat.id, '⛔️ Только админ может редактировать товары!');
  }
  const args = match[1].split(';').map(s => s.trim());
  if (args.length < 4) {
    return bot.sendMessage(msg.chat.id, '⚠️ Формат: /editproduct ID; Новое название; Новая цена; Новый путь');
  }
  const [id, name, price, location] = args;
  try {
    const res = await axios.put(`${BACKEND_URL}/products/${id}`, { name, price, location }, {
      headers: { "x-admin-secret": process.env.ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `✏️ Товар ID ${id} успешно обновлен!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось обновить товар.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка при обновлении товара:\n${err.response?.data?.error || err.message}`);
  }
});

bot.onText(/^\/delete$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) {
    return bot.sendMessage(msg.chat.id, '⛔️ Только админ может удалять товары!');
  }
  try {
    const res = await axios.get(`${BACKEND_URL}/products`);
    const products = res.data;
    if (!products.length) return bot.sendMessage(msg.chat.id, "Нет товаров для удаления.");
    let txt = `Товары:\n`;
    txt += products.map(p =>
      `ID: ${p.id}\nНазвание: ${p.name}\nЦена: $${p.price}\nФото: ${p.location}\n---`
    ).join('\n');
    txt += `\nИспользуй: /deleteproduct ID\nПример: /deleteproduct 4`;
    bot.sendMessage(msg.chat.id, txt);
  } catch (err) {
    bot.sendMessage(msg.chat.id, "Ошибка при получении товаров.");
  }
});

bot.onText(/^\/deleteproduct (\d+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) {
    return bot.sendMessage(msg.chat.id, '⛔️ Только админ может удалять товары!');
  }
  const id = match[1];
  try {
    const res = await axios.delete(`${BACKEND_URL}/products/${id}`, {
      headers: { "x-admin-secret": process.env.ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `🗑️ Товар ID ${id} успешно удалён!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось удалить товар.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка при удалении товара:\n${err.response?.data?.error || err.message}`);
  }
});

module.exports = { notifyAdminOrder };

if (require.main === module) {
  bot.sendMessage(ADMIN_CHAT_ID, 'Бот на связи! Напиши /help для подсказок по командам.');
}
