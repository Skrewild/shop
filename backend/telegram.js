require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const ADMIN_CHAT_ID = String(process.env.TELEGRAM_CHAT_ID);
const BACKEND_URL = process.env.BACKEND_URL || 'https://shop-kw6q.onrender.com';
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function isAdmin(msg) {
  return String(msg.chat?.id || msg.from?.id) === ADMIN_CHAT_ID;
}

function showAdminMenu(chatId) {
  bot.sendMessage(chatId, 'Выберите действие:', {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '➕ Добавить товар', callback_data: 'add_prod' },
          { text: '✏️ Редактировать товар', callback_data: 'edit_prod' },
          { text: '🗑️ Удалить товар', callback_data: 'del_prod' }
        ]
      ]
    }
  });
}

bot.onText(/\/start/, (msg) => {
  if (!isAdmin(msg)) return bot.sendMessage(msg.chat.id, '⛔️ Нет доступа!');
  showAdminMenu(msg.chat.id);
});

bot.onText(/\/menu/, (msg) => {
  if (!isAdmin(msg)) return bot.sendMessage(msg.chat.id, '⛔️ Нет доступа!');
  showAdminMenu(msg.chat.id);
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  bot.answerCallbackQuery(query.id);

  if (!isAdmin({ chat: { id: chatId } })) return;
  if (query.data === 'add_prod') {
    bot.sendMessage(chatId, 'Формат:\n<название> ; <цена> ; <products/файл.jpg>\n\nНапример:\nSneakers ; 59.99 ; products/shoe.jpg');
    bot.once('message', async (msg) => {
      if (!isAdmin(msg)) return;
      const args = msg.text.split(';').map(s => s.trim());
      if (args.length < 3) {
        return bot.sendMessage(chatId, '⚠️ Формат: <название> ; <цена> ; <products/файл.jpg>');
      }
      const [name, price, location] = args;
      try {
        const res = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location });
        if (res.data.success) {
          bot.sendMessage(chatId, `✅ Товар "${name}" успешно добавлен!`);
        } else {
          bot.sendMessage(chatId, `⚠️ Ошибка: ${res.data.error || 'Не удалось добавить товар.'}`);
        }
      } catch (err) {
        bot.sendMessage(chatId, `❌ Ошибка при добавлении товара:\n${err.response?.data?.error || err.message}`);
      }
    });
    return;
  }
  if (query.data === 'edit_prod') {
    // Получаем товары
    try {
      const { data: items } = await axios.get(`${BACKEND_URL}/products`);
      if (!items.length) return bot.sendMessage(chatId, "Нет товаров для редактирования.");
      // Показать список с кнопками
      const keyboard = items.map(i => ([{
        text: `${i.name} ($${i.price})`,
        callback_data: `edit_${i.id}`
      }]));
      bot.sendMessage(chatId, 'Выберите товар для редактирования:', {
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (err) {
      bot.sendMessage(chatId, "Ошибка загрузки товаров: " + (err.message || ""));
    }
    return;
  }

  if (query.data === 'del_prod') {
    try {
      const { data: items } = await axios.get(`${BACKEND_URL}/products`);
      if (!items.length) return bot.sendMessage(chatId, "Нет товаров для удаления.");
      const keyboard = items.map(i => ([{
        text: `${i.name} ($${i.price})`,
        callback_data: `del_${i.id}`
      }]));
      bot.sendMessage(chatId, 'Выберите товар для удаления:', {
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (err) {
      bot.sendMessage(chatId, "Ошибка загрузки товаров: " + (err.message || ""));
    }
    return;
  }

  if (query.data.startsWith('del_')) {
    const id = query.data.replace('del_', '');
    try {
      await axios.delete(`${BACKEND_URL}/products/${id}`, {
        headers: { 'x-admin-secret': ADMIN_SECRET }
      });
      bot.sendMessage(chatId, '✅ Товар успешно удалён!');
    } catch (err) {
      bot.sendMessage(chatId, `❌ Ошибка при удалении: ${err.response?.data?.error || err.message}`);
    }
    return;
  }

  if (query.data.startsWith('edit_')) {
    const id = query.data.replace('edit_', '');
    // Запрашиваем новые значения
    bot.sendMessage(chatId, 'Введите новые данные товара в формате:\n<название> ; <цена> ; <products/файл.jpg>');
    bot.once('message', async (msg) => {
      if (!isAdmin(msg)) return;
      const args = msg.text.split(';').map(s => s.trim());
      if (args.length < 3) {
        return bot.sendMessage(chatId, '⚠️ Формат: <название> ; <цена> ; <products/файл.jpg>');
      }
      const [name, price, location] = args;
      try {
        await axios.put(`${BACKEND_URL}/products/${id}`, { name, price, location }, {
          headers: { 'x-admin-secret': ADMIN_SECRET }
        });
        bot.sendMessage(chatId, '✅ Товар успешно обновлён!');
      } catch (err) {
        bot.sendMessage(chatId, `❌ Ошибка при обновлении: ${err.response?.data?.error || err.message}`);
      }
    });
    return;
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
