require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

async function notifyAdminOrder({ email, user = {}, items, total, orderId }) {
  const info = `
🛒 Order!!!${orderId ? ` №${orderId}` : ""}!
👤 Name: ${user.name || "—"}
📧 Email: ${email}
☎️ Contact: ${user.contact || "—"}
🏙️ City: ${user.city || "—"}
🏠 Adress: ${user.address || "—"}

${items.map(i => `• ${i.name} — $${i.price}`).join('\n')}
💵 Result: $${total}
  `.trim();

  await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, info);
}

module.exports = { notifyAdminOrder };

if (require.main === module) {
  notifyAdminOrder({
    email: "test@example.com",
    user: {
      name: "Тест",
      contact: "+771234567",
      city: "Алматы",
      address: "asd"
    },
    items: [{ name: "Тестовый товар", price: 99.99 }],
    total: 99.99,
    orderId: "test-001"
  })
    .then(() => {
      console.log('Уведомление успешно отправлено!');
      process.exit(0);
    })
    .catch(e => {
      console.error('Ошибка при отправке уведомления:', e);
      process.exit(1);
    });
}
