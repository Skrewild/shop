require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'https://shop-kw6q.onrender.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET;

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

bot.onText(/^\/products$/, async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;

  try {
    const { data: items } = await axios.get(`${BACKEND_URL}/products`);
    if (!items.length) return bot.sendMessage(msg.chat.id, '❌ Нет товаров в базе.');

    const keyboard = items.map(item => ([{
      text: `${item.name} ($${item.price})`,
      callback_data: `product_${item.id}`
    }]));
    bot.sendMessage(msg.chat.id, 'Список товаров:', {
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (err) {
    bot.sendMessage(msg.chat.id, 'Ошибка при получении товаров.');
  }
});

bot.on('callback_query', async (query) => {
  const { data, message } = query;
  if (!data.startsWith('product_')) return;

  const id = data.split('_')[1];
  try {
    const { data: items } = await axios.get(`${BACKEND_URL}/products`);
    const item = items.find(i => String(i.id) === String(id));
    if (!item) return bot.sendMessage(message.chat.id, "Товар не найден!");

    const text = `Товар:\nID: ${item.id}\nНазвание: ${item.name}\nЦена: $${item.price}\nФото: ${item.location}`;
    bot.sendMessage(message.chat.id, text, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✏️ Редактировать", callback_data: `edit_${id}` },
            { text: "🗑️ Удалить", callback_data: `delete_${id}` }
          ]
        ]
      }
    });
  } catch {
    bot.sendMessage(message.chat.id, "Ошибка при поиске товара.");
  }
});

bot.on('callback_query', async (query) => {
  const { data, message } = query;
  if (!data.startsWith('delete_')) return;

  const id = data.split('_')[1];
  try {
    const res = await axios.delete(`${BACKEND_URL}/products/${id}`, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(message.chat.id, `✅ Товар удалён!`);
    } else {
      bot.sendMessage(message.chat.id, `Ошибка: ${res.data.error || "Не удалось удалить товар."}`);
    }
  } catch (e) {
    bot.sendMessage(message.chat.id, "Ошибка удаления товара.");
  }
});

const editState = {};
bot.on('callback_query', (query) => {
  const { data, message, from } = query;
  if (!data.startsWith('edit_')) return;

  const id = data.split('_')[1];
  editState[from.id] = id;
  bot.sendMessage(message.chat.id,
    `Отправь новые данные для товара через ;\n\nНазвание; Цена; products/файл.jpg\n\nПример:\nКроссовки 2; 299.99; products/shoe2.jpg`
  );
});

bot.on('message', async (msg) => {
  if (!editState[msg.from.id]) return;
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) return;

  const id = editState[msg.from.id];
  delete editState[msg.from.id];

  const args = msg.text.split(';').map(s => s.trim());
  if (args.length < 3) {
    return bot.sendMessage(msg.chat.id, '⚠️ Формат: Название; Цена; products/файл.jpg');
  }
  const [name, price, location] = args;
  try {
    const res = await axios.put(`${BACKEND_URL}/products/${id}`, { name, price, location }, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `✅ Товар успешно обновлён!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось обновить.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка:\n${err.response?.data?.error || err.message}`);
  }
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
    const res = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location }, {
      headers: { 'x-admin-secret': ADMIN_SECRET }
    });
    if (res.data.success) {
      bot.sendMessage(msg.chat.id, `✅ Товар "${name}" успешно добавлен!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ Ошибка: ${res.data.error || 'Не удалось добавить товар.'}`);
    }
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Ошибка при добавлении товара:\n${err.response?.data?.error || err.message}`);
  }
});

module.exports = { notifyAdminOrder };
