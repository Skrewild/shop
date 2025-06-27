require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'https://shop-kw6q.onrender.com';

const mainMenu = {
  reply_markup: {
    keyboard: [
      [{ text: "➕ Добавить товар" }, { text: "✏️ Изменить товар" }],
      [{ text: "🗑️ Удалить товар" }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  }
};

bot.onText(/^\/start/, (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) {
    return bot.sendMessage(msg.chat.id, '⛔️ Доступно только админу!');
  }
  bot.sendMessage(msg.chat.id, "Добро пожаловать в меню управления товарами! Выберите действие:", mainMenu);
});

bot.on('message', async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;

  // Добавить товар
  if (msg.text === "➕ Добавить товар") {
    return bot.sendMessage(msg.chat.id, 'Пришлите в формате: Название; Цена; products/файл.jpg\nПример: Крутые Кроссы; 59.99; products/shoes.jpg');
  }

  if (msg.text === "✏️ Изменить товар") {
    return bot.sendMessage(msg.chat.id, 'Пришлите в формате: ID; Новое название; Новая цена; products/файл.jpg\nПример: 2; Куртка; 89.99; products/jacket.jpg');
  }

  if (msg.text === "🗑️ Удалить товар") {
    return bot.sendMessage(msg.chat.id, 'Пришлите ID товара, который хотите удалить.');
  }

  if (/^[^;]+;\s*\d+(\.\d+)?;\s*products\/.+\.(jpg|png)$/i.test(msg.text)) {
    const [name, price, location] = msg.text.split(';').map(s => s.trim());
    try {
      const res = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location });
      if (res.data.success) {
        return bot.sendMessage(msg.chat.id, `✅ Товар "${name}" успешно добавлен!`);
      } else {
        return bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось добавить товар.'}`);
      }
    } catch (err) {
      return bot.sendMessage(msg.chat.id, `❌ Ошибка при добавлении товара:\n${err.response?.data?.error || err.message}`);
    }
  }

  if (/^\d+;\s*[^;]+;\s*\d+(\.\d+)?;\s*products\/.+\.(jpg|png)$/i.test(msg.text)) {
    const [id, name, price, location] = msg.text.split(';').map(s => s.trim());
    try {
      const res = await axios.put(`${BACKEND_URL}/products/${id}`, { name, price, location }, {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET }
      });
      if (res.data.success) {
        return bot.sendMessage(msg.chat.id, `✏️ Товар #${id} успешно изменён.`);
      } else {
        return bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось изменить товар.'}`);
      }
    } catch (err) {
      return bot.sendMessage(msg.chat.id, `❌ Ошибка при изменении товара:\n${err.response?.data?.error || err.message}`);
    }
  }

  if (/^\d+$/.test(msg.text)) {
    const id = msg.text.trim();
    try {
      const res = await axios.delete(`${BACKEND_URL}/products/${id}`, {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET }
      });
      if (res.data.success) {
        return bot.sendMessage(msg.chat.id, `🗑️ Товар #${id} успешно удалён.`);
      } else {
        return bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось удалить товар.'}`);
      }
    } catch (err) {
      return bot.sendMessage(msg.chat.id, `❌ Ошибка при удалении товара:\n${err.response?.data?.error || err.message}`);
    }
  }
});

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

  await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, info);
}

module.exports = { notifyAdminOrder };
