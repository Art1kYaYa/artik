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

// Сообщения для случайной отправки
const randomMessages = [
    `Подпишитесь на телеграмм канал MishanYaMine - https://t.me/+dt8Sh8x762FmYWYy`,
    `Группа ВКонтакте MishanYaMine - https://vk.com/mishanyayasubtop`,
    `Подпишитесь на YouTube-канал MishanYaMine - https://youtube.com/channel/UCL0D1BXNuwPaqbsFO7KBJ1g?si=sLFOvhrbNMu0pwj_`,
    `Поддержите MishanYaMine донатом - https://www.donationalerts.com/r/mihadred`
];

// Ключевые фразы для триггера сервера
const keywords = [
    '! server', '!server', '! сервер', '!сервер', '!сервер?', '!server?', '! сервер?', '! server?'
];

// Ключевые фразы для триггера сообщений о сервере
const triggerPhrases = [
    'Как зайти на сервер?',
    'Как с тобой поиграть?',
    'Можно к тебе?',
    'Можно к вам?',
    'Как поиграть с тобой?',
    'Как попасть на сервер?',
    'Можно зайти к тебе?',
    'Как попасть к вам?',
    'Что нужно, чтобы зайти на сервер?',
    'Хочу поиграть с тобой',
    'Как подключиться к серверу?',
    'Можно ли зайти на сервер?',
    'Как вступить на сервер?',
    'Можно на сервер?',
    'Как начать играть с тобой?',
    'Как получить доступ к серверу?',
    'Что нужно, чтобы попасть на сервер?',
    'Можно ли поиграть с тобой?',
    'Дай IP сервера',
    'Какой IP у сервера?',
    'Как зайти на ваш сервер?',
    'Можно играть с вами?',
    'Как начать играть на сервере?',
    'Что нужно, чтобы зайти?',
    'Можно ли подключиться?',
    'Какой сервер у тебя?',
    'Привет можно поиграть?',
    'Шо за сервер?',
    'А как на сервер попасть?',
    'Как попасть на ваш сервер?',
    'Как работает сервер?',
    'Где найти сервер?',
    'Можно ли присоединиться к серверу?',
    'Как войти на сервер?',
    'Можно IP сервера?',
    'Что нужно, чтобы войти на сервер?',
    'Как называется сервер?',
    'Скинь IP сервера',
    'Скиньте сервер',
    'Какой у вас сервер?',
    'Сервер открытый?',
    'Как играть с вами на сервере?',
    'Какие условия для входа на сервер?',
    'Как добавить сервер?',
    'Доступ к серверу',
    'Как включить сервер?',
    'Как зарегистрироваться на сервере?',
    'Скинь данные для входа на сервер'
];

// Функция для выбора случайного сообщения
function getRandomMessage() {
    const randomIndex = Math.floor(Math.random() * randomMessages.length);
    return randomMessages[randomIndex];
}

// Отправка случайного сообщения каждые 3 минуты
setInterval(() => {
    const message = getRandomMessage();
    client.say(opts.channels[0], message);
    console.log(`Отправлено случайное сообщение: ${message}`);
}, 3 * 60 * 1000); // Каждые 3 минуты

// Обработка сообщений в чате
client.on('message', (channel, tags, message, self) => {
    if (self) return; // Игнорируем сообщения от самого бота

    // Приводим сообщение к нижнему регистру для проверки
    const lowerCaseMessage = message.toLowerCase();

    // Сообщение-ответ для фразы о сервере
    const responseMessage = `Чтобы поиграть с MishanYaMine на его ПРИВАТНОМ РП СЕРВЕРЕ, нужно оплатить проходку которая стоит ВСЕГО 199 Рублей, ЛИБО НАКОПИТЬ 1К БАЛЛОВ НА МОЕМ ТВИЧ КАНАЛЕ. ПОСЛЕ ОПЛАТЫ напиши мне в VK - https://vk.com/mishanyaya2222`;

    // Проверяем ключевые слова для фразы о сервере
    if (keywords.some(keyword => lowerCaseMessage.includes(keyword)) || triggerPhrases.some(phrase => lowerCaseMessage.includes(phrase.toLowerCase()))) {
        client.say(channel, responseMessage);
    }

    // Ключевые фразы для приветствия
    const greetings = ['ку', 'привет', 'здарова', 'hi', 'hello', 'хай', 'салам', 'САЛАМ'];

    // Проверяем ключевые фразы для приветствия
    if (greetings.some(greeting => lowerCaseMessage.split(/\s+/).includes(greeting))) {
        client.say(channel, `Добро пожаловать на стрим, ${tags.username}!`);
    }
});

// Обработка событий ошибки
client.on('error', (err) => {
    console.error('Ошибка клиента:', err);
});