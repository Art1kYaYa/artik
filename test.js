const TelegramBot = require('node-telegram-bot-api');
const token = '8023867940:AAF4T8ZHis1mIoyYVJiKXfYIGswvvCcaVTo'; // Ваш токен
const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;

  // Проверяем, есть ли новые участники
  if (msg.new_chat_members) {
    msg.new_chat_members.forEach((member) => {
      const name = member.first_name || 'Пользователь';

      // Формируем приветственное сообщение
      const welcomeMessage = `Добро пожаловать, ${name}! 🎉\n\n` +
        `*Правила сервера:* [Ознакомиться](https://telegra.ph/Pravila-Servera-07-19-3)\n` +
        `*Глобальная информация:* [Подробнее](https://telegra.ph/informaciya-07-19-64)\n` +
        `*Twitch:* [mishanyamine](https://www.twitch.tv/mishanyamine)\n` +
        `*Купить товары:* [Перейти](https://servermishanyaya.easydonate.ru/)\n` +
        `*Лаунчер, моды и ресурс пак для игры:* [Перейти](https://servermishanyaya.easydonate.ru/resources)\n` +
        `*Подпишитесь на телеграмм канал:* [MishanYaMine](https://t.me/+dt8Sh8x762FmYWYy)`;

      // Отправляем сообщение
      bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
      });
    });
  }
});
