const tmi = require('tmi.js');

// Настройки бота
const opts = {
    identity: {
        username: 'artikyaya', // Имя пользователя бота на Twitch
        password: 'oauth:9bjr6f2lfvqkzbvo5ji4gh52j1kfkh' // OAuth токен, сгенерированный ранее
    },
    channels: [
        'artikyaya' // Канал, к которому подключается бот
    ]
};

// Создаем клиент
const client = new tmi.Client(opts);

// Подключение к Twitch
client.connect()
    .then(() => console.log('Бот подключился к чату!'))
    .catch(err => console.error('Ошибка подключения:', err));

// Слушаем сообщения в чате
client.on('message', (channel, tags, message, self) => {
    if (self) return; // Игнорируем сообщения от самого бота

    console.log(`[${channel}] ${tags['display-name']}: ${message}`);

    // Пример команды
    if (message.toLowerCase() === '!hello') {
        client.say(channel, `Привет, @${tags['display-name']}! 👋`);
    }
});

// Логируем ошибки
client.on('error', (err) => {
    console.error('Ошибка:', err);
});
