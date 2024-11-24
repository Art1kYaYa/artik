const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '7758731240:AAHEtPHVTX-CfWqlwVk7zTim1_SwUHqFbcc';
const bot = new TelegramBot(token, { polling: true });

const usersFile = './users.json';
const finesFile = './fines.json';


const taxWorkers = [1378783537, 2030128216, 7045248304];  


let users = loadData(usersFile) || {};
let fines = loadData(finesFile) || {};
const authorizedUsers = []; 
const employees = []; 

function loadData(filename) {
  if (fs.existsSync(filename)) {
    const data = fs.readFileSync(filename, 'utf-8');
    return JSON.parse(data);
  }
  return null;
}

function saveData(filename, data) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
}

// Команда /help
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
  `🆘 Список доступных команд:\n\n` +
  `/balance - Посмотреть текущий баланс.\n` +
  `/check_fines - Показать неоплаченные штрафы.\n` +
  `/pay <сумма> - Оплатить штраф (пример: /pay 50).\n` +
  `/archive - Просмотреть архив штрафов.\n` +
  `/contact - Контактная информация.\n` +
  `/start - Главное меню.\n` +
    
  `Используйте эти команды для работы с ботом!`
     );
  
  });


function isTaxWorker(userId) {
  return taxWorkers.includes(userId);
}

bot.onText(/\/contact/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    `📞 Контактная информация:\n\n` +
    `- Свяжитесь с администрацией бота через Telegram: @ArtikYaYa, @NeArtikYaYa.\n` +
    `- Свяжитесь с Главой Налоговой @Tovslo.\n` +
    `- Свяжитесь с Главой ПСМ @suuuuuperrr123, @ozon_krutoy.\n` +
    `Мы рады вам помочь!`
  );
});
bot.onText(/\/delete_fine (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const fineIndex = match[1];

  if (!taxWorkers.includes(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только администраторам.');
    return;
  }

  if (fines[fineIndex]) {
    fines.splice(fineIndex, 1);
    saveData(finesFile, fines);
    bot.sendMessage(chatId, `✅ Штраф ${fineIndex} удален.`);
  } else {
    bot.sendMessage(chatId, '❌ Штраф не найден.');
  }
});
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  if (users[chatId]) {
    bot.sendMessage(chatId, 'Вы уже зарегистрированы! Используйте /help, чтобы увидеть доступные команды.', mainMenu);
  } else {
    bot.sendMessage(chatId, 
      'Добро пожаловать в Налоговую Сервера Мед! Пожалуйста, зарегистрируйтесь, используя команду /register <имя>. Внимание, обязательно указывайте ник через @. Например: /register @ArtikYaYa.\n\n' +
      'Если вы хотите работать в налоговой, пишите @Tovslo.\n' +
      'Если проблемы с ботом, обращайтесь к @ArtikYaYa.'
    );

  }
});

const mainMenu = {
  reply_markup: {
    keyboard: [
      ['/balance'],   // 1-я кнопка
      ['/check_fines'],         // 2-я кнопка
      ['/archive'],              // 3-я кнопка
      ['/contact'],               // 4-я кнопка
    ],
    one_time_keyboard: true,           // Клавиатура исчезнет после нажатия кнопки
    resize_keyboard: true,             // Изменяет размер клавиатуры под содержимое
  },
};

// Команда для просмотра всех неоплаченных штрафов
bot.onText(/\/list_fines/, (msg) => {
  const chatId = msg.chat.id;

  if (!taxWorkers.includes(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только администраторам.');
    return;
  }

  let finesList = '📋 Список всех неоплаченных штрафов:\n\n';
  const buttons = [];
  let foundFines = false;

  for (const [userId, userFines] of Object.entries(fines)) {
    userFines.forEach((fine, index) => {
      if (!fine.paid) {
        foundFines = true;
        finesList += `ID: ${userId}-${index}\n` +
          `- Пользователь: ${users[userId]?.username || 'Неизвестно'}\n` +
          `- Сумма: ${fine.amount} ар\n` +
          `- Причина: ${fine.reason || 'Не указана'}\n` +
          `- Дата: ${fine.date}\n\n`;

        buttons.push([{
          text: `Удалить штраф ID ${userId}-${index}`,
          callback_data: `delete_fine_${userId}_${index}`
        }]);
      }
    });
  }

  if (!foundFines) {
    bot.sendMessage(chatId, '✅ В системе нет неоплаченных штрафов.');
    return;
  }

  bot.sendMessage(chatId, finesList, {
    reply_markup: {
      inline_keyboard: buttons
    }
  });
});

// Обработка нажатия кнопки удаления
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('delete_fine_')) {
    const parts = data.split('_');
    const userId = parts[2];
    const fineIndex = parseInt(parts[3]);

    if (fines[userId] && fines[userId][fineIndex]) {
      fines[userId].splice(fineIndex, 1);

      // Удаляем массив, если он пустой
      if (fines[userId].length === 0) {
        delete fines[userId];
      }

      saveData(finesFile, fines);

      bot.answerCallbackQuery(query.id, { text: '✅ Штраф удален.' });
      bot.sendMessage(chatId, `✅ Штраф с ID ${userId}-${fineIndex} успешно удален.`);
    } else {
      bot.answerCallbackQuery(query.id, { text: '❌ Штраф не найден.' });
    }
  }
});
bot.onText(/\/worker_help/, (msg) => {
  const chatId = msg.chat.id;


  if (!msg.from || !users[chatId] || !users[chatId].role.includes('worker')) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только работникам Налоговой.');
    return;
  }

  const helpMessage = `
  🔹 Привет! Вот список команд для работников Налоговой Сервера Мед и как ими пользоваться:

  1. /fine <ID> <Сумма> <Причина> - Выписать штраф. ВНИМАНИ!!! ID это тег пользователя, который можно получить прописав /list.

  2. /list - Список всех авторизованных.

  3. /approve <номер заявки> — Подтвердить заявку на оплату от пользователя.


  Команды для Администраторов:

  1. **/remove_worker <ID пользователя>** — Удалить права работника у пользователя.

  2. **/add_worker <ID пользователя>** — Добавить пользователя в список работников.
     - Используется для назначения прав работника пользователю. Пример: /add_worker 987654321.

  3. **/logs** - Последние взоимодействия с ботом.

  Если у вас есть вопросы или нужно дополнительное объяснение, не стесняйтесь обращаться!
  `;

  bot.sendMessage(chatId, helpMessage);
});


// Команда для добавления работника (доступно только администраторам)
bot.onText(/\/add_worker (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToAdd = match[1];

  // Проверка: администратор
  if (!taxWorkers.includes(chatId)) {
    // Здесь уведомление отправляется только один раз
    bot.sendMessage(chatId, '❌ Эта команда доступна только администраторам.');
    return;
  }

  // Проверяем, есть ли пользователь в системе
  if (users[userIdToAdd]) {
    const user = users[userIdToAdd];
    if (user.role !== 'worker') {
      user.role = 'worker'; // Устанавливаем роль "worker"
      saveData(usersFile, users); // Сохраняем изменения

      bot.sendMessage(chatId, `✅ Пользователь ${user.username} (ID: ${userIdToAdd}) теперь является работником.`);
      bot.sendMessage(userIdToAdd, `✅ Вы добавлены в список работников. Все команды которые вам доступны: /worker_help`);
    } else {
      bot.sendMessage(chatId, `⚠️ Пользователь ${user.username} (ID: ${userIdToAdd}) уже является работником.`);
    }
  } else {
    bot.sendMessage(chatId, '❌ Пользователь с указанным ID не найден.');
  }
});

// Команда для снятия прав работника (доступно только администраторам)
bot.onText(/\/remove_worker (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToRemove = match[1];

  // Проверка: администратор
  if (!taxWorkers.includes(chatId)) {
    // Здесь уведомление отправляется только один раз
    bot.sendMessage(chatId, '❌ Эта команда доступна только администраторам.');
    return;
  }

  // Проверяем, есть ли пользователь в системе
  if (users[userIdToRemove]) {
    const user = users[userIdToRemove];
    if (user.role === 'worker') {
      user.role = 'user'; // Меняем роль на обычного пользователя
      saveData(usersFile, users); // Сохраняем изменения

      bot.sendMessage(chatId, `✅ Пользователь ${user.username} (ID: ${userIdToRemove}) теперь больше не является работником.`);
      bot.sendMessage(userIdToRemove, `❌ Ваши права работника были сняты.`);
    } else {
      bot.sendMessage(chatId, `⚠️ Пользователь ${user.username} (ID: ${userIdToRemove}) не является работником.`);
    }
  } else {
    bot.sendMessage(chatId, '❌ Пользователь с указанным ID не найден.');
  }
});



// Функция для загрузки данных из файла
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  } else {
    return { authorizedUsers: [], employees: [] }; // Если файл не существует
  }
}




bot.onText(/\/register (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1];

  if (users[chatId]) {
    bot.sendMessage(chatId, '✅ Вы уже зарегистрированы!');
  } else {

    if (!username.startsWith('@')) {
      bot.sendMessage(chatId, '🛑 Никнейм должен начинаться с символа "@". Пожалуйста, выберите другой никнейм.');
      return;
    }


    const isUsernameTaken = Object.values(users).some(user => user.username.toLowerCase() === username.toLowerCase());
    if (isUsernameTaken) {
      bot.sendMessage(chatId, `🛑 Имя "${username}" уже занято. Пожалуйста, выберите другое имя.`);
      return;
    }

    users[chatId] = { username, balance: 0 };
    saveData(usersFile, users);
    bot.sendMessage(chatId, `✅ Регистрация успешна! Добро пожаловать, ${username}. Список доступных команд: /help`);
  }
});


// Функция для загрузки данных из файла
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  } else {
    return {};
  }
}


// Функция для загрузки данных из файла
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  } else {
    return {};
  }
}

// Функция для сохранения данных в файл
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}

// Функция для загрузки данных из файла
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  } else {
    return {};
  }
}

// Функция для сохранения данных в файл
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}


// Обновление данных пользователей, чтобы у каждого было поле `role`
function ensureRoles(users) {
  for (const userId in users) {
    if (!users[userId].role) {
      users[userId].role = 'user'; // По умолчанию присваиваем роль "user"
    }
  }
  saveUsers(users); // Сохраняем изменения
}

// Убедимся, что все пользователи имеют поле `role`
ensureRoles(users);


bot.onText(/\/fine/, (msg) => {
  if (!isTaxWorker(msg.chat.id)) {
    bot.sendMessage(msg.chat.id, '❌ Эта команда доступна только работникам налоговой.');
    return;
  }
  bot.sendMessage(msg.chat.id, '🛑 Правильный формат команды: /fine <пользователь> <сумма> <причина>\nПример: /fine @username 100 Нарушение правил.');
});


bot.onText(/\/fine (@\w+) (\d+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;


  if (!isTaxWorker(chatId)) {
    bot.sendMessage(chatId, '');
    return;
  }

  const targetUsername = match[1];
  const amount = parseInt(match[2]);
  const reason = match[3];

  if (isNaN(amount) || amount <= 0) {
    bot.sendMessage(chatId, '🛑 Пожалуйста, укажите корректную сумму штрафа.');
    return;
  }


  const userId = Object.keys(users).find(id => users[id].username === targetUsername);

  if (!userId) {
    bot.sendMessage(chatId, `🛑 Пользователь с именем ${targetUsername} не найден. Проверьте имя и попробуйте снова.`);
    return;
  }


  if (!fines[userId]) fines[userId] = [];


  fines[userId].push({ amount, reason, date: new Date().toISOString(), paid: false });

  saveData(finesFile, fines);
  saveData(usersFile, users);

  bot.sendMessage(chatId, `🛑 Штраф для ${targetUsername} на сумму ${amount}ар успешно добавлен. Причина: ${reason}`);
  bot.sendMessage(userId, `✅ Вам был выписан штраф на сумму ${amount}ар. Причина: ${reason}. Текущий баланс: ${users[userId].balance}`);
});


// Функция для загрузки данных из файла
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data); // Возвращаем объект
  } else {
    return {}; // Если файла нет, возвращаем пустой объект
  }
}


// Функция для загрузки данных из файла
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data); // Возвращаем объект
  } else {
    return {}; // Если файла нет, возвращаем пустой объект
  }
}




// Путь к файлам с данными пользователей


// Функция для загрузки данных пользователей
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data); // Возвращаем объект
  } else {
    return {}; // Если файла нет, возвращаем пустой объект
  }
}

// Функция для сохранения данных пользователей
function saveUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
}

// Загрузка данных пользователей


// Команда /list - список всех пользователей с их ролями
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id); // Приводим ID к строке, так как ключи в users хранятся как строки
  const text = msg.text;

  if (text === '/list') {
    // Проверяем, есть ли пользователь в списке и является ли он работником
    if (users[userId] && (users[userId].role === 'worker' || users[userId].role === 'admin')) {
      let response = "📋 **Список пользователей:**\n";

      if (Object.keys(users).length > 0) {
        Object.entries(users).forEach(([id, userData]) => {
          const role = userData.role || 'user'; // Если роль отсутствует, устанавливается 'user'
          response += `- ${userData.username} (ID: ${id}, Баланс: ${userData.balance}, Роль: ${role})\n`;
        });
      } else {
        response += "Нет данных.";
      }

      bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    } else {
      // Если пользователь не работник, отправляем сообщение об ограничении
      bot.sendMessage(chatId, '❌ Эта команда доступна только работникам налоговой.');
    }
  }
});


// Обработка всех сообщений
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Если текст не соответствует известным командам, сообщаем о неизвестной команде
  const knownCommands = ['/start', '/register', '/balance', '/check_fines', '/pay', '/archive', '/fine', '/approve', '/list', '/ban', '/unban', '/help', '/add_worker', '/remove_worker', '/worker_help', '/contact'];

  if (!knownCommands.some(command => text.startsWith(command))) {
    bot.sendMessage(chatId, `🛑 Неизвестная команда: "${text}", используйте /help`);
  }
});


bot.onText(/\/pay (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const fineIndex = parseInt(match[1]);

  if (!users[chatId]) {
    bot.sendMessage(chatId, '🛑 Вы не зарегистрированы! Используйте команду /register <имя> для регистрации.');
    return;
  }

  const userFines = fines[chatId] || [];
  if (!userFines || userFines.length <= fineIndex) {
    bot.sendMessage(chatId, '');
    return;
  }

  const fine = userFines[fineIndex];

  if (fine.paid) {
    bot.sendMessage(chatId, '✅ Успешно!');
    return;
  }

  // Проверка баланса для оплаты штрафа
  if (users[chatId].balance >= fine.amount) {
    // Уменьшаем баланс пользователя и помечаем штраф как оплаченный
    users[chatId].balance -= fine.amount;
    fine.paid = true;

    // Сохраняем изменения
    saveData(usersFile, users);
    saveData(finesFile, fines);

    bot.sendMessage(chatId, `✅ Штраф на сумму ${fine.amount}ар успешно оплачен. Ваш новый баланс: ${users[chatId].balance}`);
  } else {
    bot.sendMessage(chatId, `🛑 У вас недостаточно средств для оплаты штрафа. Ваш баланс: ${users[chatId].balance}`);
  }
});


// Команда /balance для отображения баланса
bot.onText(/\/balance/, (msg) => {
  const chatId = msg.chat.id;

  if (users[chatId]) {
    let balance = users[chatId].balance;
    const stacks = Math.floor(balance / 64); // Считаем количество полных стаков
    const remainder = balance % 64; // Считаем остаток

    // Сообщение с количеством стаков
    let stackMessage = `📦 Стаков: ${stacks}`;
    if (remainder > 0) {
      stackMessage += ` + 1 неполный стак (${remainder} ар)`;
    }

    // Отправляем сообщение пользователю с текущим балансом
    bot.sendMessage(
      chatId,
      `✅ Ваш баланс: ${balance} ар\n${stackMessage}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Обновить баланс', callback_data: 'refresh_balance' },
              { text: '❌ Закрыть меню', callback_data: 'close_menu' },
            ],
          ],
        },
      }
    );

    // Удаляем команду /balance, чтобы не было лишних сообщений
    bot.deleteMessage(chatId, msg.message_id);
  } else {
    bot.sendMessage(chatId, '🛑 Вы не зарегистрированы! Используйте команду /register <имя> для регистрации.');
  }
});

// Обработка нажатия кнопок
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === 'refresh_balance') {
    // Пример: обновление баланса без изменения суммы
    const balance = users[chatId].balance;
    const stacks = Math.floor(balance / 64); // Считаем полные стаки
    const remainder = balance % 64; // Считаем остаток

    let stackMessage = `📦 Стаков: ${stacks}`;
    if (remainder > 0) {
      stackMessage += ` + 1 неполный стак (${remainder} ар)`;
    }

    // Обновляем сообщение с балансом
    bot.editMessageText(
      `✅ Ваш обновленный баланс: ${balance} ар\n${stackMessage}`,
      {
        chat_id: chatId,
        message_id: callbackQuery.message.message_id,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🔄 Обновить баланс', callback_data: 'refresh_balance' },
              { text: '❌ Закрыть меню', callback_data: 'close_menu' },
            ],
          ],
        },
      }
    );
  } else if (data === 'close_menu') {
    // Закрытие меню
    bot.deleteMessage(chatId, callbackQuery.message.message_id);
  }
});

// Загрузка данных при запуске
loadUsers();

const interactionLogs = [];
bot.on('message', (msg) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    username: msg.from.username || 'Без имени',
    chatId: msg.chat.id,
    text: msg.text || 'Без текста'
  };

  interactionLogs.push(logEntry);

  console.log(`[${logEntry.timestamp}] Пользователь: ${logEntry.username}, ID чата: ${logEntry.chatId}, Сообщение: "${logEntry.text}"`);
});

function addFine(chatId, amount, reason) {
  if (!fines[chatId]) {
    fines[chatId] = [];
  }

  const fine = {
    amount,
    reason,
    paid: false,
    cancelled: false,
    createdAt: Date.now(),
    doubled: false, // Флаг, что штраф уже удвоен
    warned: false,  // Флаг, что предупреждение о суде уже отправлено
  };

  fines[chatId].push(fine);

  bot.sendMessage(chatId, `🚨 Вам выписан штраф на сумму ${amount} ар за: ${reason}.`);

  // Таймер для удвоения штрафа через минуту
  setTimeout(() => {
    if (!fine.paid && !fine.cancelled && !fine.doubled) {
      fine.amount *= 2; // Удвоение штрафа
      fine.doubled = true;

      bot.sendMessage(
        chatId,
        `⚠️ Ваш штраф увеличился в 2 раза! Теперь он составляет ${fine.amount} ар.`
      );
    }

    // Таймер для предупреждения о суде еще через минуту
    setTimeout(() => {
      if (!fine.paid && !fine.cancelled && fine.doubled && !fine.warned) {
        fine.warned = true;

        bot.sendMessage(
          chatId,
          `⚠️ Ваш штраф не был оплачен вовремя. Мы подаем дело в суд.`
        );
      }
    }, 60 * 1000); // 1 минута
  }, 60 * 1000); // 1 минута
}

// Функция для добавления штрафа

// Регистрация команды /archive
bot.onText(/\/archive/, (msg) => {
  const chatId = msg.chat.id;

  if (!users[chatId]) {
    bot.sendMessage(chatId, '🛑 Вы не зарегистрированы! Используйте команду /register <имя> для регистрации.');
    return;
  }

  const userFines = fines[chatId] || [];
  const archiveList = userFines
    .filter((fine) => fine.paid || fine.cancelled)
    .map((fine, index) => {
      const status = fine.paid
        ? 'Оплачен'
        : fine.cancelled
        ? 'Аннулирован'
        : 'Неизвестно';

      return `Штраф ${index + 1}:\n` +
             `- Сумма: ${fine.amount} ар\n` +
             `- Причина: ${fine.reason || 'Не указана'}\n` +
             `- Статус: ${status}\n` +
             `- Дата: ${
               fine.paidAt ? new Date(fine.paidAt).toLocaleString() : 'Не указана'
             }\n\n`;
    });

  const response = archiveList.length > 0
    ? '📂 Архив штрафов:\n\n' + archiveList.join('')
    : '📂 У вас нет архивных штрафов.';

  // Отправляем сообщение с кнопками
  bot.sendMessage(chatId, response, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '❌ Закрыть меню', callback_data: 'close_menu' },
          { text: '📋 Посмотреть текущие штрафы', callback_data: 'view_current_fines' },
        ],
      ],
    },
  }).then((message) => {
    // Удаляем предыдущее сообщение
    bot.deleteMessage(chatId, msg.message_id);
  });
});

// Обработка нажатий на кнопки
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === 'close_menu') {
    // Закрытие меню
    bot.deleteMessage(chatId, callbackQuery.message.message_id);
  } else if (data === 'view_current_fines') {
    // Удаляем старое сообщение
    bot.deleteMessage(chatId, callbackQuery.message.message_id);

    // Просмотр текущих штрафов
    const userFines = fines[chatId] || [];
    const currentFines = userFines
      .filter(fine => !fine.paid && !fine.cancelled)
      .map((fine, index) => {
        return `Штраф ${index + 1}:\n` +
               `- Сумма: ${fine.amount} ар\n` +
               `- Причина: ${fine.reason || 'Не указана'}\n` +
               `- Статус: Неоплачено\n` +
               `- Дата: ${new Date(fine.date).toLocaleString()}\n\n`;
      });

    const response = currentFines.length > 0
      ? '📋 Текущие штрафы:\n\n' + currentFines.join('')
      : '📋 У вас нет текущих штрафов.';

    // Отправляем сообщение с кнопками для текущих штрафов
    bot.sendMessage(chatId, response, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '❌ Закрыть меню', callback_data: 'close_menu' },
            { text: '📂 Посмотреть архив штрафов', callback_data: 'archive' },
          ],
        ],
      },
    });
  } else if (data === 'archive') {
    // Удаляем старое сообщение
    bot.deleteMessage(chatId, callbackQuery.message.message_id);

    // Вернуться к просмотру архива
    const userFines = fines[chatId] || [];
    const archiveList = userFines
      .filter((fine) => fine.paid || fine.cancelled)
      .map((fine, index) => {
        const status = fine.paid
          ? 'Оплачен'
          : fine.cancelled
          ? 'Аннулирован'
          : 'Неизвестно';

        return `Штраф ${index + 1}:\n` +
               `- Сумма: ${fine.amount} ар\n` +
               `- Причина: ${fine.reason || 'Не указана'}\n` +
               `- Статус: ${status}\n` +
               `- Дата: ${
                 fine.paidAt ? new Date(fine.paidAt).toLocaleString() : 'Не указана'
               }\n\n`;
      });

    const response = archiveList.length > 0
      ? '📂 Архив штрафов:\n\n' + archiveList.join('')
      : '📂 У вас нет архивных штрафов.';

    // Отправляем сообщение с кнопками для архива
    bot.sendMessage(chatId, response, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '❌ Закрыть меню', callback_data: 'close_menu' },
            { text: '📋 Посмотреть текущие штрафы', callback_data: 'view_current_fines' },
          ],
        ],
      },
    });
  }
});


// Регистрация команды /check_fines
bot.onText(/\/check_fines/, (msg) => {
  const chatId = msg.chat.id;

  // Проверка, зарегистрирован ли пользователь
  if (!users[chatId]) {
    bot.sendMessage(chatId, ' 🛑 Вы не зарегистрированы в системе.');
    return;
  }

  const userFines = fines[chatId];

  // Проверка, есть ли у пользователя штрафы
  if (!userFines || userFines.length === 0) {
    bot.sendMessage(chatId, '✅ У вас нет штрафов.');
    return;
  }

  let finesList = '✅ Ваши текущие штрафы:\n\n';

  // Отображаем только неоплаченные и активные штрафы
  userFines.forEach((fine, index) => {
    if (!fine.paid && !fine.cancelled) {
      // Проверяем, может ли штраф быть оплачен
      if (users[chatId].balance >= fine.amount) {
        // Достаточно средств для оплаты штрафа
        users[chatId].balance -= fine.amount; // Вычитаем сумму
        fine.paid = true; // Обновляем статус на "Оплачен"
        fine.paidAt = Date.now(); // Фиксируем время оплаты
      }

      // Добавляем информацию о штрафе в список
      finesList += `Штраф ${index + 1}:\n` +
                   `- Сумма: ${fine.amount} ар\n` +
                   `- Причина: ${fine.reason || 'Не указана'}\n` +
                   `- Статус: ${
                     fine.paid ? 'Оплачен' : 'Ожидает оплаты (недостаточно средств)'
                   }\n\n`;
    }
  });

  if (finesList === '✅ Ваши текущие штрафы:\n\n') {
    finesList = '✅ У вас нет неоплаченных штрафов.';
  }

  // Сохраняем изменения в данных
  saveData(finesFile, fines);


  // Функция для обработки пополнения баланса
  function handleBalanceUpdate(chatId, addedAmount) {
    users[chatId].balance += addedAmount; // Пополняем баланс

    userFines.forEach((fine) => {
      if (!fine.paid && !fine.cancelled && users[chatId].balance >= fine.amount) {
        // Списываем штраф из пополненного баланса
        users[chatId].balance -= fine.amount;
        fine.paid = true;
        fine.paidAt = Date.now(); // Фиксируем время оплаты
      }
    });


  }

  // Функция для обработки пополнения баланса
  function handleBalanceUpdate(chatId, addedAmount) {
    users[chatId].balance += addedAmount; // Пополняем баланс

    userFines.forEach((fine) => {
      if (!fine.paid && !fine.cancelled && users[chatId].balance >= fine.amount) {
        // Списываем штраф из пополненного баланса
        users[chatId].balance -= fine.amount;
        fine.paid = true;
        fine.paidAt = Date.now(); // Фиксируем время оплаты
      }
    });

    bot.sendMessage(chatId, `✅ Ваш баланс: ${users[chatId].balance} ар.`);
  }

  // Вывод баланса и штрафов

  bot.sendMessage(chatId, finesList);
});

// Файл для хранения заявок на оплату
const paymentsFile = './payments.json';
let payments = loadData(paymentsFile) || [];

// Команда для создания заявки на оплату с возможной причиной
bot.onText(/\/pay (\d+)(?: (.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const amount = parseInt(match[1]);
  const comment = match[2] || 'Оплата штрафа'; // Если причина не указана, ставим "Оплата штрафа"

  if (isNaN(amount) || amount <= 0) {
    bot.sendMessage(chatId, '🛑 Пожалуйста, укажите корректную сумму для оплаты.');
    return;
  }

  if (!users[chatId]) {
    bot.sendMessage(chatId, '🛑 Вы не зарегистрированы! Используйте команду /register <имя> для регистрации.');
    return;
  }

  // Создание заявки на оплату
  const paymentRequest = {
    userId: chatId,
    username: users[chatId].username,
    amount,
    comment,
    date: new Date().toISOString(),
    status: 'pending' // статус "ожидание подтверждения"
  };

  payments.push(paymentRequest);
  saveData(paymentsFile, payments);

  bot.sendMessage(chatId, `✅ Заявка на оплату на сумму ${amount} создана. Ожидайте подтверждения.`);
  notifyTaxWorkers(paymentRequest);  // Уведомление для налоговых работников
});
// Команда /cancel_fine для аннулирования штрафа (только для работников налоговой)
bot.onText(/\/cancel_fine (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const fineIndex = parseInt(match[1]);

  // Проверка, является ли пользователь работником налоговой
  if (!isTaxWorker(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только работникам налоговой.');
    return;
  }

  // Находим ID пользователя по индексу штрафа
  let targetUserId;
  for (const userId in fines) {
    if (fines[userId][fineIndex]) {
      targetUserId = userId;
      break;
    }
  }

  if (!targetUserId || !fines[targetUserId] || !fines[targetUserId][fineIndex]) {
    bot.sendMessage(chatId, '🛑 Штраф с таким индексом не найден.');
    return;
  }

  const fine = fines[targetUserId][fineIndex];

  // Проверка, не был ли уже отменён штраф
  if (fine.cancelled) {
    bot.sendMessage(chatId, `🛑 Этот штраф уже был отменён.`);
    return;
  }

  // Аннулирование штрафа
  fine.cancelled = true;

  // Возвращаем сумму штрафа на баланс пользователя
  users[targetUserId].balance += fine.amount;

  // Сохраняем изменения в файлах
  saveData(finesFile, fines);
  saveData(usersFile, users);

  // Уведомление работников налоговой и пользователя
  bot.sendMessage(chatId, `🛑 Штраф для ${users[targetUserId].username} на сумму ${fine.amount} был успешно аннулирован.`);
  bot.sendMessage(targetUserId, `✅ Ваш штраф на сумму ${fine.amount} был аннулирован. Ваш новый баланс: ${users[targetUserId].balance}`);
});
// Подсказка для использования /cancel_fine (если команда была написана неверно)
bot.onText(/\/cancel_fine/, (msg) => {
  const chatId = msg.chat.id;

  if (!isTaxWorker(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только работникам налоговой.');
    return;
  }

  bot.sendMessage(chatId, '🛑 Используйте команду в следующем формате: /cancel_fine <индекс штрафа>\nПример: /cancel_fine 2\nКоманда отменит штраф с указанным индексом.');
});
// Функция для уведомления работников налоговой о новой заявке
function notifyTaxWorkers(paymentRequest) {
  taxWorkers.forEach(workerId => {
    bot.sendMessage(workerId, `🛑 Новая заявка на оплату:\n\nПользователь: ${paymentRequest.username}\nСумма: ${paymentRequest.amount}ар\nКомментарий: ${paymentRequest.comment}\nДата: ${paymentRequest.date}\n\nПодтвердите её командой /list_payments`);
  });
}


// Команда для отображения всех заявок на оплату
bot.onText(/\/list_payments/, (msg) => {
  const chatId = msg.chat.id;

  // Проверяем, является ли пользователь работником налоговой
  if (!isTaxWorker(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только работникам налоговой.');
    return;
  }

  let paymentsList = '📋 Список заявок на оплату:\n\n';
  const buttons = [];
  let foundPayments = false;

  payments.forEach((payment, index) => {
    if (payment.status === 'pending') {
      foundPayments = true;
      paymentsList += `Заявка №${index}\n` +
        `- Пользователь: ${payment.username}\n` +
        `- Сумма: ${payment.amount} ар\n` +
        `- Комментарий: ${payment.comment || 'Нет'}\n` +
        `- Дата: ${payment.date}\n\n`;

      buttons.push([{
        text: `Подтвердить оплату №${index}`,
        callback_data: `approve_payment_${index}`
      }]);
    }
  });

  if (!foundPayments) {
    bot.sendMessage(chatId, '✅ Нет ожидающих заявок на оплату.');
    return;
  }

  bot.sendMessage(chatId, paymentsList, {
    reply_markup: {
      inline_keyboard: buttons
    }
  });
});

// Обработка нажатия кнопки для подтверждения оплаты
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('approve_payment_')) {
    const paymentIndex = parseInt(data.split('_')[2]);

    if (isNaN(paymentIndex) || !payments[paymentIndex]) {
      bot.answerCallbackQuery(query.id, { text: '❌ Заявка не найдена.' });
      return;
    }

    const payment = payments[paymentIndex];

    if (payment.status !== 'pending') {
      bot.answerCallbackQuery(query.id, { text: '🛑 Эта заявка уже обработана.' });
      return;
    }

    // Подтверждаем оплату и обновляем данные
    users[payment.userId].balance += payment.amount;
    payment.status = 'approved';

    saveData(paymentsFile, payments);
    saveData(usersFile, users);

    bot.answerCallbackQuery(query.id, { text: `✅ Оплата на сумму ${payment.amount} ар подтверждена.` });
    bot.sendMessage(chatId, `🛑 Оплата на сумму ${payment.amount} для пользователя ${payment.username} подтверждена.`);
    bot.sendMessage(payment.userId, `✅ Ваша заявка на оплату на сумму ${payment.amount} была подтверждена!`);
  }
});
