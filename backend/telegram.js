const TelegramBot = require('node-telegram-bot-api');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

const bot = new TelegramBot(TOKEN);

async function notifyAdminOrder(orderData) {
  const msg = `
🛒 Новый заказ!

Пользователь: ${orderData.email}
Товары:
${orderData.items.map((it, i) => `${i+1}) ${it.name} — $${it.price}`).join('\n')}
Сумма: $${orderData.total}
  `.trim();

  await bot.sendMessage(ADMIN_CHAT_ID, msg);
}

module.exports = { notifyAdminOrder };
