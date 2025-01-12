// Импортируем библиотеку tmi.js
const tmi = require('tmi.js');

// Настройки бота
const opts = {
    identity: {
        username: 'artikyaya', // Имя вашего Twitch-бота
        password: 'oauth:uu06j4l9bjfgn7h0kkd1sg6acszejw' // OAuth-токен для вашего бота
    },
    channels: [
        'mishanyamine' // Канал, где бот будет активен
    ]
};

// Создаем клиент бота
const client = new tmi.Client(opts);

// Подключение к Twitch-каналу с обработкой ошибок
client.connect().catch((err) => {
    console.error('Ошибка подключения к Twitch:', err);
});

// Сообщение-ответ для фразы о сервере
const responseMessage = `Чтобы поиграть с MishanYaMine на его ПРИВАТНОМ РП СЕРВЕРЕ, нужно оплатить проходку которая стоит ВСЕГО 199 Рублей, ЛИБО НАКОПИТЬ 1К БАЛЛОВ НА МОЕМ ТВИЧ КАНАЛЕ. ПОСЛЕ ОПЛАТЫ напиши мне в VK - https://vk.com/mishanyaya2222`;

// Сообщение для трансляции
const broadcastMessage = `Подпишитесь на телеграмм канал MishanYaMine - https://t.me/+dt8Sh8x762FmYWYy`;

// Ключевые фразы для триггера сервера
const keywords = ['! server', '!server', '! сервер'];

// Ключевые фразы для приветствия
const greetings = ['ку', 'привет', 'здарова', 'hi', 'hello', 'хай'];

// Время задержки между ответами (в миллисекундах)
const delayTime = 10000; // 10 секунд
let lastMessageTime = 0; // Время последнего отправленного сообщения


    // Устанавливаем интервал для повторной отправки сообщения
    setInterval(() => {
        client.say(opts.channels[0], broadcastMessage);
    }, 30 * 60 * 1000); // Каждые 30 минут


// Обработка сообщений в чате
client.on('message', (channel, tags, message, self) => {
    if (self) return; // Игнорируем сообщения от самого бота

    // Приводим сообщение к нижнему регистру для корректной проверки
    const lowerCaseMessage = message.toLowerCase();

    // Проверяем, прошло ли достаточно времени с последнего сообщения
    const currentTime = Date.now();
    if (currentTime - lastMessageTime < delayTime) {
        return; // Если прошло меньше 10 секунд, игнорируем сообщение
    }

    // Проверяем ключевые слова для фразы о сервере
    if (keywords.some(keyword => lowerCaseMessage.includes(keyword))) {
        client.say(channel, responseMessage);
        lastMessageTime = currentTime; // Обновляем время последнего сообщения
    }

    // Проверяем ключевые фразы для приветствия
    if (greetings.some(greeting => lowerCaseMessage.includes(greeting))) {
        client.say(channel, `Добро пожаловать на стрим, ${tags.username}!`);
        lastMessageTime = currentTime; // Обновляем время последнего сообщения
    }
});

// Обработка событий ошибки
client.on('error', (err) => {
    console.error('Ошибка клиента:', err);
});
