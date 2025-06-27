require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BACKEND_URL = process.env.BACKEND_URL;

bot.on('photo', async (msg) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) {
    return bot.sendMessage(msg.chat.id, '⛔️ Только админ может добавлять товары!');
  }

  if (!msg.caption) {
    return bot.sendMessage(msg.chat.id, '⚠️ Введите подпись к фото: Название; Цена');
  }

  const args = msg.caption.split(';').map(s => s.trim());
  if (args.length < 2) {
    return bot.sendMessage(msg.chat.id, '⚠️ Формат: подпись к фото — Название; Цена');
  }

  const [name, price] = args;

  const file_id = msg.photo[msg.photo.length - 1].file_id;
  try {
    const file = await bot.getFile(file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const res = await axios.post(`${BACKEND_URL}/products/add`, {
      name, price, location: fileUrl
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

bot.onText(/^\/addproduct (.+)/, async (msg, match) => {
  if (String(msg.chat.id) !== String(ADMIN_CHAT_ID)) {
    return bot.sendMessage(msg.chat.id, '⛔️ Только админ может добавлять товары!');
  }

  const args = match[1].split(';').map(s => s.trim());
  if (args.length < 3) {
    return bot.sendMessage(msg.chat.id, '⚠️ Формат: /addproduct Название; Цена; ссылка_на_фото');
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
