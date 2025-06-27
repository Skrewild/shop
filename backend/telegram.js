require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

async function notifyAdminOrder({ email, items, total }) {
  const msg = `🛒 Новый заказ!\nПочта: ${email}\n${items.map(i => `Товар: ${i.name}, Цена: ${i.price}`).join('\n')}\nОбщая сумма: $${total}`;
  await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, msg);
}

module.exports = { notifyAdminOrder };

if (require.main === module) {
  bot.sendMessage(process.env.TELEGRAM_CHAT_ID, '✅ Тест: бот на связи!')
    .then(() => {
      console.log('Уведомление успешно отправлено!');
      process.exit(0);
    })
    .catch(e => {
      console.error('Ошибка при отправке уведомления:', e);
      process.exit(1);
    });
}
