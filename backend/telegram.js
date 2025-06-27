require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });

const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'https://shop-kw6q.onrender.com';

function isAdmin(msg) {
  return String(msg.chat.id) === String(ADMIN_CHAT_ID);
}

bot.onText(/^\/admin$/, (msg) => {
  if (!isAdmin(msg)) return bot.sendMessage(msg.chat.id, '⛔️ Только для админа!');
  bot.sendMessage(msg.chat.id, '🔐 Админ-меню. Выберите действие:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Добавить товар', callback_data: 'add_prod' }],
        [{ text: '✏️ Изменить товар', callback_data: 'edit_prod' }],
        [{ text: '🗑️ Удалить товар', callback_data: 'delete_prod' }],
      ]
    }
  });
});

// ----- Обработка кнопок -----
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  if (!isAdmin({ chat: { id: chatId } })) return;

  if (query.data === 'add_prod') {
    bot.sendMessage(chatId, 'Отправьте данные для нового товара в формате:\nНазвание; Цена; products/файл.jpg');
    bot.once('message', async (msg) => {
      if (!isAdmin(msg)) return;
      const args = msg.text.split(';').map(s => s.trim());
      if (args.length < 3) return bot.sendMessage(chatId, '❗ Формат: Название; Цена; products/файл.jpg');
      const [name, price, location] = args;
      try {
        const res = await axios.post(`${BACKEND_URL}/products/add`, { name, price, location });
        if (res.data.success) {
          bot.sendMessage(chatId, `✅ Товар "${name}" добавлен!`);
        } else {
          bot.sendMessage(chatId, `⚠️ Ошибка: ${res.data.error || 'Не удалось добавить.'}`);
        }
      } catch (e) {
        bot.sendMessage(chatId, 'Ошибка: ' + (e.response?.data?.error || e.message));
      }
    });
  }

  if (query.data === 'edit_prod' || query.data === 'delete_prod') {
    try {
      const { data: products } = await axios.get(`${BACKEND_URL}/products`);
      if (!products.length) return bot.sendMessage(chatId, '❗ Товаров нет.');
      const buttons = products.map(prod => {
        const text = `${prod.id}: ${prod.name} ($${prod.price})`;
        const cd = (query.data === 'edit_prod' ? 'edit_' : 'del_') + prod.id;
        return [{ text, callback_data: cd }];
      });
      bot.sendMessage(chatId, 'Список товаров:', {
        reply_markup: { inline_keyboard: buttons }
      });
    } catch (e) {
      bot.sendMessage(chatId, 'Ошибка получения списка товаров.');
    }
  }

  if (query.data.startsWith('edit_')) {
    const id = query.data.replace('edit_', '');
    bot.sendMessage(chatId, 'Введите новые данные для товара (Название; Цена; products/файл.jpg):');
    bot.once('message', async (msg) => {
      if (!isAdmin(msg)) return;
      const args = msg.text.split(';').map(s => s.trim());
      if (args.length < 3) return bot.sendMessage(chatId, '❗ Формат: Название; Цена; products/файл.jpg');
      const [name, price, location] = args;
      try {
        const res = await axios.put(`${BACKEND_URL}/products/${id}`,
          { name, price, location },
          { headers: { 'x-admin-secret': process.env.ADMIN_SECRET } }
        );
        if (res.data.success) {
          bot.sendMessage(chatId, `✏️ Товар ${id} успешно изменён!`);
        } else {
          bot.sendMessage(chatId, `⚠️ Ошибка: ${res.data.error || 'Не удалось изменить.'}`);
        }
      } catch (e) {
        bot.sendMessage(chatId, 'Ошибка: ' + (e.response?.data?.error || e.message));
      }
    });
  }

  if (query.data.startsWith('del_')) {
    const id = query.data.replace('del_', '');
    bot.sendMessage(chatId, `Вы уверены, что хотите удалить товар ${id}?`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: 'Да, удалить', callback_data: `del_confirm_${id}` },
            { text: 'Нет', callback_data: 'cancel' }
          ]
        ]
      }
    });
  }

  if (query.data.startsWith('del_confirm_')) {
    const id = query.data.replace('del_confirm_', '');
    try {
      const res = await axios.delete(`${BACKEND_URL}/products/${id}`, {
        headers: { 'x-admin-secret': process.env.ADMIN_SECRET }
      });
      if (res.data.success) {
        bot.sendMessage(chatId, `🗑️ Товар ${id} удалён!`);
      } else {
        bot.sendMessage(chatId, `⚠️ Ошибка: ${res.data.error || 'Не удалось удалить.'}`);
      }
    } catch (e) {
      bot.sendMessage(chatId, 'Ошибка: ' + (e.response?.data?.error || e.message));
    }
  }

  if (query.data === 'cancel') {
    bot.sendMessage(chatId, 'Действие отменено.');
  }

  bot.answerCallbackQuery(query.id);
});

bot.onText(/^\/start$/, (msg) => {
  if (!isAdmin(msg)) return;
  bot.sendMessage(msg.chat.id, 'Добро пожаловать в админ-бот! Используй /admin для работы с товарами.');
});

bot.onText(/^\/help$/, (msg) => {
  if (!isAdmin(msg)) return;
  bot.sendMessage(msg.chat.id, 
`Доступные команды:
/admin — админ-меню с кнопками и списками товаров
/addproduct — добавить товар (используй лучше меню)
/editproduct — изменить товар (используй лучше меню)
/deleteproduct — удалить товар (используй лучше меню)
`);
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
