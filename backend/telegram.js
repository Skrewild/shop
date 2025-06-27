require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

async function notifyAdminOrder({ email, items, total, orderId }) {
  let text = `🛒 Новый заказ!\n\n`;
  text += `Заказ #${orderId}\n`;
  text += `Email пользователя: ${email}\n\n`;
  text += `Состав заказа:\n`;
  for (const item of items) {
    text += `- ${item.name || 'Товар'} (ID: ${item.item_id}) — $${item.price}\n`;
  }
  text += `\nИтого: $${total}\n`;
  text += `Время: ${new Date().toLocaleString('ru-RU')}`;

  try {
    await bot.sendMessage(ADMIN_CHAT_ID, text);
  } catch (err) {
    console.error("Не удалось отправить уведомление в Telegram:", err.message);
  }
}

module.exports = { notifyAdminOrder };
