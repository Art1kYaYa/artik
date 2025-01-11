const tmi = require('tmi.js');

// Настройки бота
const opts = {
    identity: {
        username: 'artikyaya', // Имя бота
        password: 'oauth:9bjr6f2lfvqkzbvo5ji4gh52j1kfkh' // Токен доступа
    },
    channels: [
        'artikyaya' // Канал, к которому подключается бот
    ]
};

// Создаем клиента
const client = new tmi.Client(opts);

// Подключаемся к Twitch
client.connect()
    .then(() => console.log('Бот подключился к чату!'))
    .catch(err => console.error('Ошибка подключения:', err));

// ======== ОБРАБОТЧИКИ ========

// Приветственное сообщение
client.on('message', (channel, tags, message, self) => {
    if (self) return; // Игнорируем сообщения от самого бота

    const username = tags['display-name'] || tags['username'];

    // Пример команды "!hello"
    if (message.toLowerCase() === '!hello') {
        client.say(channel, `Привет, @${username}! 👋`);
    }

    // Команда "!random" для генерации случайного числа
    if (message.toLowerCase() === '!random') {
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        client.say(channel, `🎲 Случайное число для @${username}: ${randomNumber}`);
    }

    // Команда "!uptime" для отображения времени стрима
    if (message.toLowerCase() === '!uptime') {
        client.say(channel, '⌛ Стрим идет уже X часов Y минут'); // Для точного времени потребуется Twitch API
    }

    // Команда "!commands" для отображения доступных команд
    if (message.toLowerCase() === '!commands') {
        client.say(channel, '📜 Доступные команды: !hello, !random, !uptime, !commands, !shoutout');
    }

    // Команда "!shoutout" для рекламы другого стримера
    if (message.toLowerCase().startsWith('!shoutout ')) {
        const target = message.split(' ')[1];
        if (target) {
            client.say(channel, `💥 Обратите внимание на @${target}! Проверьте их канал: https://twitch.tv/${target}`);
        } else {
            client.say(channel, `⛔ Укажите имя пользователя! Например: !shoutout streamer_name`);
        }
    }
});

// Сообщение при входе нового пользователя
client.on('join', (channel, username, self) => {
    if (self) return;
    client.say(channel, `👋 Добро пожаловать в чат, @${username}!`);
});

// ======== ДОПОЛНИТЕЛЬНЫЙ ФУНКЦИОНАЛ ========

// Таймер сообщений
setInterval(() => {
    client.say('Название_канала', '📢 Не забудьте подписаться на канал и поддержать стримера!');
}, 300000); // Каждые 5 минут

// Обработка ошибок
client.on('error', (err) => {
    console.error('Ошибка:', err);
});
