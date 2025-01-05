const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '7758731240:AAHEtPHVTX-CfWqlwVk7zTim1_SwUHqFbcc';
const bot = new TelegramBot(token, { polling: true });
const adminChatId = -1002400665091; // ID админского чата

const usersFile = './users.json';
const finesFile = './fines.json';


const taxWorkers = [2030128216, 6343971096];  


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
  `/check_fines - Показать неоплаченные штрафы.\n` +
  `/archive - Просмотреть архив штрафов.\n` +
  `/contact - Контактная информация.\n` +
  `/start - Главное меню.\n\n` +
  `Команды работникам:\n` +
  `/worker_help - Помощь для работников.\n\n` +

  `Используйте эти команды для работы с ботом!`
     );

  });


function isTaxWorker(userId) {
  return taxWorkers.includes(userId);
}



bot.onText(/\/contact/, (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  // Удаляем сообщение пользователя
  bot.deleteMessage(chatId, messageId).catch((err) => {
    console.error(`Не удалось удалить сообщение: ${err.message}`);
  });

  // Отправляем сообщение с контактной информацией и кнопкой закрытия
  bot.sendMessage(
    chatId,
    `📞 Контактная информация:\n\n` +
    `- Администрация бота: @NeArtikYaYa\n` +
    `- Глава Налоговой: @Tovslo\n` +
    `- Главы ПСМ: @mak097a\n\n` +
    `Мы рады вам помочь!`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: 'Администрация бота', url: 'https://t.me/NeArtikYaYa' }],
          [{ text: 'Глава Налоговой', url: 'https://t.me/Tovslo' }],
          [
            { text: 'Глава ПСМ 1', url: 'https://t.me/mak097a' },
          ],
          [{ text: '❌ Закрыть', callback_data: 'close_contact' }],
        ],
      },
    }
  );
});

// Обработка кнопки "Закрыть"
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  if (callbackQuery.data === 'close_contact') {
    bot.deleteMessage(chatId, messageId).catch((err) => {
      console.error(`Ошибка удаления сообщения: ${err.message}`);
    });
  }
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

  3. /list_payments — Подтвердить заявку на оплату от пользователя.

  4. /report_fine — Отчет по штрафам для налоговой.

  5. /top_debtors - Топ должников.

  6. /notify_debtors - Уведомление о долгах должникам.

  7. /check_user_fines - Информация о штрафах людей.

  Команды для Администраторов:

  1. **/remove_worker <ID пользователя>** — Удалить права работника у пользователя.

  2. **/add_worker <ID пользователя>** — Добавить пользователя в список работников.
     - Используется для назначения прав работника пользователю. Пример: /add_worker 987654321.

  Если у вас есть вопросы или нужно дополнительное объяснение, не стесняйтесь обращаться!
  `;

  bot.sendMessage(chatId, helpMessage);
});


function isWorker(chatId) {
  return users[chatId]?.role === 'worker'; 
}


function deleteActiveMessage(chatId) {
  if (activeMessages[chatId]) {
    bot.deleteMessage(chatId, activeMessages[chatId]).catch(() => {});
    delete activeMessages[chatId];
  }
}

bot.onText(/\/notify_debtors/, (msg) => {
  const chatId = msg.chat.id;

  if (!isTaxWorker(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только для сотрудников налоговой.');
    return;
  }

  let notifiedCount = 0;

  for (const userId in fines) {
    const userFines = fines[userId] || [];
    const unpaidAmount = userFines
      .filter(fine => !fine.paid && !fine.cancelled)
      .reduce((sum, fine) => sum + fine.amount, 0);

    if (unpaidAmount > 0) {
      const username = users[userId]?.username || `ID: ${userId}`;
      bot.sendMessage(userId, `⚠️ У вас есть неоплаченные штрафы на сумму ${unpaidAmount} ар. Пожалуйста, погасите задолженность.`);
      notifiedCount++;
    }
  }

  bot.sendMessage(chatId, `✅ Уведомления отправлены ${notifiedCount} должникам.`);
});



bot.onText(/\/add_worker (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToAdd = match[1];

  if (!taxWorkers.includes(chatId)) {
    bot.sendMessage(chatId, '❌ Эта команда доступна только администраторам.');
    return;
  }


  if (users[userIdToAdd]) {
    const user = users[userIdToAdd];
    if (user.role !== 'worker') {
      user.role = 'worker'; 
      saveData(usersFile, users); 

      bot.sendMessage(chatId, `✅ Пользователь ${user.username} (ID: ${userIdToAdd}) теперь является работником.`);
      bot.sendMessage(userIdToAdd, `✅ Вы добавлены в список работников. Все команды которые вам доступны: /worker_help`);
    } else {
      bot.sendMessage(chatId, `⚠️ Пользователь ${user.username} (ID: ${userIdToAdd}) уже является работником.`);
    }
  } else {
    bot.sendMessage(chatId, '❌ Пользователь с указанным ID не найден.');
  }
});
bot.onText(/\/register (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1].trim(); // Убираем пробелы

  try {
    // Проверка, зарегистрирован ли пользователь
    if (users[chatId]) {
      bot.sendMessage(chatId, '✅ Вы уже зарегистрированы!');
      return;
    }

    // Проверяем, начинается ли никнейм с "@"
    if (!username.startsWith('@')) {
      bot.sendMessage(chatId, '🛑 Никнейм должен начинаться с символа "@". Пожалуйста, выберите другой никнейм.');
      return;
    }

    // Проверяем, занят ли никнейм
    const isUsernameTaken = Object.values(users).some(user => {
      // Игнорируем некорректные записи
      if (!user || !user.username) return false;
      return user.username.toLowerCase() === username.toLowerCase();
    });

    if (isUsernameTaken) {
      bot.sendMessage(chatId, `🛑 Имя "${username}" уже занято. Пожалуйста, выберите другое имя.`);
      return;
    }

    // Регистрируем пользователя
    users[chatId] = { 
      username, 
      balance: 0, 
      role: 'user' // Устанавливаем роль по умолчанию
    };

    // Сохраняем данные в файл
    saveUsers(users);

    // Подтверждаем регистрацию
    bot.sendMessage(chatId, `✅ Регистрация успешна! Добро пожаловать, ${username}. Список доступных команд: /help`);
  } catch (error) {
    console.error('Ошибка при регистрации:', error);

    bot.sendMessage(chatId, '🛑 Произошла ошибка при обработке вашей регистрации. Попробуйте позже.');
  }
});

bot.onText(/\/remove_worker (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userIdToRemove = match[1];

  if (!taxWorkers.includes(chatId)) {
    bot.sendMessage(chatId, '❌ Эта команда доступна только администраторам.');
    return;
  }


  if (users[userIdToRemove]) {
    const user = users[userIdToRemove];
    if (user.role === 'worker') {
      user.role = 'user'; 
      saveData(usersFile, users); 

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





// Функции для сохранения данных
function saveData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Проверка, является ли пользователь налоговым работником
function isTaxWorker(userId) {
  return users[userId] && (users[userId].role === 'worker' || users[userId].role === 'admin');
}

// Загрузка пользователей
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

// Загрузка штрафов
function loadFines() {
  if (fs.existsSync(finesFile)) {
    const data = fs.readFileSync(finesFile, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

// Загрузка данных
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

function loadFines() {
  if (fs.existsSync(finesFile)) {
    const data = fs.readFileSync(finesFile, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

function saveFines() {
  fs.writeFileSync(finesFile, JSON.stringify(fines, null, 2), 'utf-8');
}

// Проверка, является ли пользователь работником
function isWorker(userId) {
  return users[userId] && users[userId].role === 'worker';
}

// Загрузка данных
function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

function loadFines() {
  if (fs.existsSync(finesFile)) {
    const data = fs.readFileSync(finesFile, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

function saveFines() {
  fs.writeFileSync(finesFile, JSON.stringify(fines, null, 2), 'utf-8');
}

// Проверка, является ли пользователь работником
function isWorker(userId) {
  return users[userId] && users[userId].role === 'worker';
}

function loadUsers() {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

function loadFines() {
  if (fs.existsSync(finesFile)) {
    const data = fs.readFileSync(finesFile, 'utf-8');
    return JSON.parse(data);
  }
  return {};
}

function saveFines() {
  fs.writeFileSync(finesFile, JSON.stringify(fines, null, 2), 'utf-8');
}

// Проверка, является ли пользователь работником
function isWorker(userId) {
  return users[userId] && users[userId].role === 'worker';
}

// Выдача штрафа
bot.onText(/\/fine (@\w+) (\d+) (.+)/, (msg, match) => {
  const chatId = msg.chat.id;

  if (!isWorker(chatId)) {
    bot.sendMessage(chatId, '❌ Эта команда доступна только для работников.');
    return;
  }

  const targetUsername = match[1];
  const amount = parseInt(match[2]);
  const reason = match[3];

  if (isNaN(amount) || amount <= 0) {
    bot.sendMessage(chatId, '❌ Укажите корректную сумму штрафа.');
    return;
  }

  const targetUserId = Object.keys(users).find(
    (id) => users[id].username === targetUsername
  );

  if (!targetUserId) {
    bot.sendMessage(chatId, `❌ Пользователь ${targetUsername} не найден.`);
    return;
  }

  if (!fines[targetUserId]) fines[targetUserId] = [];

  fines[targetUserId].push({
    amount,
    reason,
    issuedBy: chatId,
    date: new Date().toISOString(),
    paid: false,
  });

  saveFines();

  bot.sendMessage(
    chatId,
    `✅ Штраф для ${targetUsername} на сумму ${amount} успешно добавлен.\nПричина: ${reason}.`
  );

  bot.sendMessage(
    targetUserId,
    `❌ Вам был выписан штраф на сумму ${amount}.\nПричина: ${reason}.\nНажмите "Штраф оплачен", если вы оплатили штраф.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Штраф оплачен',
              callback_data: `fine_paid_${targetUserId}`,
            },
          ],
        ],
      },
    }
  );
});

// Обработка кнопки "Штраф оплачен"
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith('fine_paid_')) {
    const targetUserId = data.split('_')[2];

    if (!fines[targetUserId]) {
      bot.answerCallbackQuery(query.id, { text: '❌ Штрафов не найдено.' });
      return;
    }

    const unpaidFine = fines[targetUserId].find((fine) => !fine.paid);

    if (!unpaidFine) {
      bot.answerCallbackQuery(query.id, { text: '✅ Все штрафы уже оплачены.' });
      return;
    }

    // Уведомляем всех работников налоговой для подтверждения
    Object.entries(users)
      .filter(([_, user]) => user.role === 'worker')
      .forEach(([workerId]) => {
        bot.sendMessage(
          workerId,
          `📢 Пользователь ${users[targetUserId].username} заявил, что оплатил штраф на сумму ${unpaidFine.amount}.\nПричина: ${unpaidFine.reason}.\n\nПодтвердите или отклоните оплату.`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '✅ Подтвердить оплату',
                    callback_data: `confirm_payment_${targetUserId}`,
                  },
                  {
                    text: '❌ Отклонить оплату',
                    callback_data: `reject_payment_${targetUserId}`,
                  },
                ],
              ],
            },
          }
        );
      });

    bot.answerCallbackQuery(query.id, {
      text: '✅ Заявка на оплату отправлена налоговым работникам.', // Изменил текст на "Заявка на оплату отправлена"
    });
  }

  // Подтверждение оплаты штрафа
  if (data.startsWith('confirm_payment_')) {
    const targetUserId = data.split('_')[2];

    const unpaidFineIndex = fines[targetUserId].findIndex((fine) => !fine.paid);

    if (unpaidFineIndex === -1) {
      bot.answerCallbackQuery(query.id, {
        text: '✅ Все штрафы уже оплачены.',
      });
      return;
    }

    fines[targetUserId][unpaidFineIndex].paid = true;
    saveFines();

    bot.answerCallbackQuery(query.id, {
      text: '✅ Оплата подтверждена.',
    });

    bot.sendMessage(
      query.message.chat.id,
      `✅ Оплата штрафа пользователя ${users[targetUserId].username} подтверждена.`
    );

    bot.sendMessage(
      targetUserId,
      `✅ Ваш штраф на сумму ${fines[targetUserId][unpaidFineIndex].amount} был успешно оплачен.`
    );

    // Убираем кнопки из сообщения
    bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: query.message.chat.id, message_id: query.message.message_id }
    );
  }

  // Отклонение оплаты штрафа
  if (data.startsWith('reject_payment_')) {
    const targetUserId = data.split('_')[2];

    bot.answerCallbackQuery(query.id, {
      text: '❌ Оплата отклонена.',
    });

    bot.sendMessage(
      query.message.chat.id,
      `❌ Оплата штрафа пользователя ${users[targetUserId].username} отклонена.`
    );

    bot.sendMessage(
      targetUserId,
      `❌ Ваш запрос об оплате штрафа был отклонен. Обратитесь к налоговому работнику.`
    );
  }
});

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

// Команда /archive
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
  } else if (data === 'check_fines') {
    // Удаляем старое сообщение
    bot.deleteMessage(chatId, callbackQuery.message.message_id);

    // Проверить штрафы с автоматическим списанием
    autoPayFines(chatId);

    const userFines = fines[chatId] || [];
    const unpaidFines = userFines.filter((fine) => !fine.paid && !fine.cancelled);

    if (unpaidFines.length > 0) {
      const fineList = unpaidFines.map((fine, index) => {
        return `Штраф ${index + 1}:\n` +
               `- Сумма: ${fine.amount} ар\n` +
               `- Причина: ${fine.reason || 'Не указана'}\n` +
               `- Дата: ${new Date(fine.date).toLocaleString()}\n`;
      }).join('\n');

      bot.sendMessage(chatId, `🛑 У вас есть неоплаченные штрафы:\n\n${fineList}`, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '❌ Закрыть меню', callback_data: 'close_menu' },
              { text: '📂 Посмотреть архив штрафов', callback_data: 'archive' },
            ],
          ],
        },
      });
    } else {
      bot.sendMessage(chatId, '✅ У вас нет неоплаченных штрафов.', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '❌ Закрыть меню', callback_data: 'close_menu' },
              { text: '📂 Посмотреть архив штрафов', callback_data: 'archive' },
            ],
          ],
        },
      });
    }
  }
});


// Функция для автоматической оплаты штрафов
function autoPayFines(userId) {
  const user = users[userId];
  const userFines = fines[userId] || [];

  if (!user || !userFines.length) return;

  userFines.forEach((fine) => {
    if (!fine.paid && !fine.cancelled && user.balance >= fine.amount) {
      user.balance -= fine.amount; // Списываем сумму штрафа с баланса
      fine.paid = true; // Отмечаем штраф как оплаченный
      fine.paidAt = new Date().toISOString(); // Записываем дату оплаты
    }
  });

  // Сохраняем обновленные данные
  saveData(usersFile, users);
  saveData(finesFile, fines);
}

// Функция для безопасного удаления сообщения
function safeDeleteMessage(chatId, messageId) {
  if (!chatId || !messageId) return; // Проверяем, что параметры заданы
  bot.deleteMessage(chatId, messageId).catch((err) => {
    if (err.response && err.response.body && err.response.body.description) {
      console.warn(
        `Не удалось удалить сообщение ${messageId} в чате ${chatId}: ${err.response.body.description}`
      );
    } else {
      console.error(`Не удалось удалить сообщение ${messageId} в чате ${chatId}:`, err);
    }
  });
}

// Команда /check_fines с автоматической оплатой
bot.onText(/\/check_fines/, (msg) => {
  const chatId = msg.chat.id;

  if (!users[chatId]) {
    bot.sendMessage(chatId, '🛑 Вы не зарегистрированы! Используйте команду /register <имя> для регистрации.');
    return;
  }

  // Автоматическая оплата штрафов
  autoPayFines(chatId);

  // Проверяем список штрафов пользователя
  const userFines = fines[chatId] || [];
  const unpaidFines = userFines.filter((fine) => !fine.paid && !fine.cancelled);

  let response;
  if (unpaidFines.length > 0) {
    const fineList = unpaidFines.map((fine, index) => {
      return `Штраф ${index + 1}:\n` +
             `- Сумма: ${fine.amount} ар\n` +
             `- Причина: ${fine.reason || 'Не указана'}\n` +
             `- Дата: ${new Date(fine.date).toLocaleString()}\n`;
    }).join('\n');

    response = `🛑 У вас есть неоплаченные штрафы:\n\n${fineList}`;
  } else {
    response = '✅ У вас нет неоплаченных штрафов.';
  }

  // Отправляем сообщение с кнопками
  bot.sendMessage(chatId, response, {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '❌ Закрыть меню', callback_data: 'close_menu' },
          { text: '📂 Посмотреть архив штрафов', callback_data: 'archive' },
        ],
      ],
    },
  }).then((message) => {
    // Удаляем сообщение с командой
    safeDeleteMessage(chatId, msg.message_id);
  });
});

// Обработка нажатий на кнопки
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === 'close_menu') {
    // Закрытие меню
    safeDeleteMessage(chatId, callbackQuery.message.message_id);
  } else if (data === 'archive') {
    // Удаляем старое сообщение
    safeDeleteMessage(chatId, callbackQuery.message.message_id);


  }
});


// Функция для ручной проверки штрафов (если сотрудник налоговой хочет проверить)
bot.onText(/\/check_user_fines/, (msg) => {
  const chatId = msg.chat.id;

  if (!isWorker(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только для сотрудников налоговой.');
    return;
  }

  const commandParts = msg.text.split(' ');
  const username = commandParts[1];

  if (!username) {
    bot.sendMessage(chatId, '🛑 Укажите имя пользователя. Пример: /check_user_fines @username');
    return;
  }

  const targetUserId = Object.keys(users).find((id) => users[id]?.username === username);

  if (!targetUserId) {
    bot.sendMessage(chatId, `🛑 Пользователь с именем ${username} не найден.`);
    return;
  }

  autoPayFines(targetUserId); // Автоматическая оплата штрафов для указанного пользователя

  const userFines = fines[targetUserId] || [];
  const unpaidFines = userFines.filter((fine) => !fine.paid && !fine.cancelled);

  if (unpaidFines.length > 0) {
    const fineList = unpaidFines.map((fine, index) => {
      return `Штраф ${index + 1}:\n` +
             `- Сумма: ${fine.amount} ар\n` +
             `- Причина: ${fine.reason || 'Не указана'}\n` +
             `- Дата: ${new Date(fine.date).toLocaleString()}\n`;
    }).join('\n');

    bot.sendMessage(chatId, `🛑 У пользователя ${username} есть неоплаченные штрафы:\n\n${fineList}`);
  } else {
    bot.sendMessage(chatId, `✅ У пользователя ${username} нет неоплаченных штрафов.`);
  }
});


// Команда для создания заявки на оплату с возможной причиной

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
  users[targetUserId].заявок += fine.amount;

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


// Путь к файлу payments.json
const paymentsFile = './payments.json';

// Функция для загрузки данных из JSON файла
function loadData(filePath) {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }
  return [];
}

// Функция для сохранения данных в JSON файл
function saveData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Инициализация массива payments
let payments = loadData(paymentsFile);

// Команда /pay
bot.onText(/\/pay (\d+)(?: (.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const amount = parseInt(match[1]);
  const comment = match[2] || 'Оплата штрафа';

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
    status: 'pending',
  };

  payments.push(paymentRequest);
  saveData(paymentsFile, payments);

  bot.sendMessage(chatId, `✅ Заявка на оплату на сумму ${amount} создана. Ожидайте подтверждения.`);
  notifyTaxWorkers(paymentRequest);
});

// Команда /list_payments
bot.onText(/\/list_payments/, (msg) => {
  const chatId = msg.chat.id;

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
        callback_data: `approve_payment_${index}`,
      }]);
    }
  });

  if (!foundPayments) {
    bot.sendMessage(chatId, '✅ Нет ожидающих заявок на оплату.');
    return;
  }

  bot.sendMessage(chatId, paymentsList, {
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
});

// Обработка нажатий кнопок
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
    bot.sendMessage(chatId, `✅ Оплата на сумму ${payment.amount} для пользователя ${payment.username} подтверждена.`);
    bot.sendMessage(payment.userId, `✅ Ваша заявка на оплату на сумму ${payment.amount} была подтверждена!`);
  }
});



// Команда для просмотра необработанных заявок с кнопками подтверждения
bot.onText(/\/list_pending/, (msg) => {
  const chatId = msg.chat.id;

  const pendingDeliveries = deliveries.filter((d) => d.status === 'pending');

  if (pendingDeliveries.length === 0) {
    bot.sendMessage(chatId, '✅ Все заявки обработаны.');
    return;
  }

  pendingDeliveries.forEach((delivery) => {
    bot.sendMessage(
      chatId,
      `📦 *Заявка №${delivery.id}:*\n\n` +
        `- Никнейм: ${delivery.nickname}\n` +
        `- Товары: ${delivery.items}\n` +
        `- Координаты: ${delivery.coordinates}\n` +
        `- Дата: ${delivery.date}\n`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: `✅ Подтвердить заявку №${delivery.id}`, callback_data: `confirm_delivery_${delivery.id}` }
            ]
          ]
        }
      }
    );
  });

  // Кнопка для закрытия меню
  bot.sendMessage(chatId, '📋 Все заявки отображены.', {
    reply_markup: {
      inline_keyboard: [[{ text: 'Закрыть меню', callback_data: 'close_menu' }]]
    }
  });
});

// Обработка нажатий на кнопки подтверждения заявки
bot.on('callback_query', (query) => {
  const data = query.data;

  if (data.startsWith('confirm_delivery_')) {
    const deliveryId = parseInt(data.split('_')[2]);
    const delivery = deliveries.find((d) => d.id === deliveryId);

    if (delivery && delivery.status === 'pending') {
      delivery.status = 'completed';
      saveDeliveries();

      bot.answerCallbackQuery(query.id, { text: '✅ Заявка подтверждена.' });

      // Уведомление в чат
      bot.sendMessage(
        deliveryChatId,
        `✅ Заявка №${delivery.id} успешно подтверждена!\nДоставка для игрока ${delivery.nickname} завершена.`
      );

      // Уведомление игроку
      bot.sendMessage(
        query.message.chat.id,
        `🎉 Ваша заявка на доставку была успешно выполнена!`
      );
    } else {
      bot.answerCallbackQuery(query.id, { text: '❌ Заявка уже обработана или не найдена.' });
    }
  } else if (data === 'close_menu') {
    // Удаляем сообщение с меню
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
    bot.sendMessage(query.message.chat.id, 'Меню закрыто.');
  }
});


const deliveriesFile = 'deliveries.json';

// Загружаем данные о доставках из файла
let deliveries = [];
if (fs.existsSync(deliveriesFile)) {
  deliveries = JSON.parse(fs.readFileSync(deliveriesFile, 'utf8'));
}

// Сохраняем данные в файл
function saveDeliveries() {
  fs.writeFileSync(deliveriesFile, JSON.stringify(deliveries, null, 2), 'utf-8');
}

// Загружаем данные о доставках
function loadDeliveries() {
  if (fs.existsSync(deliveriesFile)) {
    const data = fs.readFileSync(deliveriesFile, 'utf-8');
    return JSON.parse(data);
  }
  return [];
}

// Загружаем заявки при старте
deliveries = loadDeliveries();

// Хранилище для отслеживания попыток с ошибками
const deliveryAttempts = {};

// Регулярное выражение для проверки формата заявки
const deliveryFormatRegex =
  /Никнейм:\s*(.+)\nТовары:\s*(.+)\nКоординаты:\s*(.+)\nДата оформление доставки:\s*(\d{2}\/\d{2}\/\d{4})/;

// Функция для получения текущей даты в формате DD/MM/YYYY
function getCurrentDate() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  return `${day}/${month}/${year}`;
}
// Дополнительно добавляем информацию о боте

// Команда /оформить_доставку
bot.onText(/\/оформить_доставку/, (msg) => {
  const chatId = msg.chat.id;

  // Сбрасываем счетчик ошибок
  deliveryAttempts[chatId] = 0;

  // Текст шаблона с текущей датой
  const deliveryTemplate =
    `Никнейм: 
Товары: 
Координаты: x y z
Дата оформление доставки: ${getCurrentDate()}`;

  // Отправляем сообщение с инструкцией
  bot.sendMessage(
    chatId,
    `Чтобы оформить доставку, заполните анкету по следующему образцу:\n\n` +
      `*Образец:*\n\n${deliveryTemplate}\n\n` +
      `📌 Важно: Товары, пожалуйста, разделяйте запятыми.\n` + 
      `📌 Важно: Если товар не доставляется, а выдается (например, команды /co i, /co near, /v или префикс), в поле координат указывайте нули.\n\n` +
      `Сообщение должно строго соответствовать формату!`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Копировать образец',
              callback_data: 'copy_delivery_template',
            },
          ],
        ],
      },
    }
  );
});

// Слушаем нажатие на кнопку
bot.on('callback_query', (query) => {
  const chatId = query.message.chat.id;

  if (query.data === 'copy_delivery_template') {
    // Отправляем текст шаблона пользователю для копирования
    const deliveryTemplate =
      `Никнейм: 
Товары: 
Координаты: x y z
Дата оформление доставки: ${getCurrentDate()}`;
    bot.sendMessage(chatId, deliveryTemplate, { parse_mode: 'Markdown' });
    bot.answerCallbackQuery(query.id, { text: 'Шаблон отправлен!' });
  }
});

// Проверка сообщений на соответствие формату
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Если пользователь не вводил команду /оформить_доставку, игнорируем
  if (deliveryAttempts[chatId] === undefined) return;

  // Проверяем, соответствует ли сообщение формату
  if (deliveryFormatRegex.test(text)) {
    const match = text.match(deliveryFormatRegex);
    const nickname = match[1].trim();

    if (!nickname) {
      bot.sendMessage(
        chatId,
        `❌ Поле "Никнейм" не должно быть пустым. Заполните анкету по образцу!`
      );
      return;
    }

    deliveryAttempts[chatId] = 0; // Сбрасываем счетчик

    const deliveryData = {
      nickname: nickname,
      items: match[2].trim(),
      coordinates: match[3].trim(),
      date: match[4].trim(),
      chatId: chatId, // Сохраняем ID чата отправителя
    };

    // Добавляем данные в список доставок и сохраняем
    deliveries.push(deliveryData);
    saveDeliveries();

    // Оповещаем игрока
    bot.sendMessage(chatId, '✅ Ваша заявка успешно отправлена на обработку!');

    // Отправляем заявку в админский чат
    bot.sendMessage(
      adminChatId,
      `📦 *Новая заявка на доставку:*\n\n` +
        `*Никнейм:* ${deliveryData.nickname}\n` +
        `*Товары:* ${deliveryData.items}\n` +
        `*Координаты:* ${deliveryData.coordinates}\n` +
        `*Дата оформления доставки:* ${deliveryData.date}`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Подтвердить доставку',
                callback_data: `confirm_${nickname}`,
              },
            ],
          ],
        },
      }
    );
  } else {
    // Увеличиваем счетчик ошибок
    deliveryAttempts[chatId] = (deliveryAttempts[chatId] || 0) + 1;

    if (deliveryAttempts[chatId] >= 3) {
      // Сброс после трех неудачных попыток
      delete deliveryAttempts[chatId];
      bot.sendMessage(
        chatId,
        `❌ Трижды введено сообщение не по образцу. Попробуйте снова, начав с команды /оформить_доставку.`
      );
    } else {
      bot.sendMessage(
        chatId,
        `❌ Сообщение не соответствует формату.\n\n*Образец:*\n\n` +
          `*Никнейм:* Ваш_Никнейм\n` +
          `*Товары:* примерный список товаров\n` +
          `*Координаты:* x y z\n` +
          `*Дата оформление доставки:* ${getCurrentDate()}\n\n` +
          `Сообщение должно строго соответствовать формату!`,
        { parse_mode: 'Markdown' }
      );
    }
  }
});

// Обработка кнопки "Подтвердить доставку"
bot.on('callback_query', (callbackQuery) => {
  const data = callbackQuery.data;

  if (data.startsWith('confirm_')) {
    const nickname = data.split('_')[1];

    // Находим заявку по никнейму
    const delivery = deliveries.find((delivery) => delivery.nickname === nickname);

    // Удаляем заявку
    deliveries = deliveries.filter((delivery) => delivery.nickname !== nickname);
    saveDeliveries();

    // Уведомляем администратора
    bot.sendMessage(adminChatId, `✅ Доставка для ${nickname} подтверждена.`);

    // Убираем кнопку из сообщения
    bot.editMessageReplyMarkup(
      { inline_keyboard: [] },
      { chat_id: callbackQuery.message.chat.id, message_id: callbackQuery.message.message_id }
    );

    bot.answerCallbackQuery(callbackQuery.id, { text: 'Доставка подтверждена!' });

    // Отправляем уведомление пользователю, который отправил заявку
    if (delivery) {
      bot.sendMessage(
        delivery.chatId,
        `📦 Ваша заявка на доставку была успешно выполнена. Спасибо за использование нашего бота!`
      );
    }
  }
});


bot.onText(/\/submit_case/, (msg) => {
  const chatId = msg.chat.id;

  // Текст, который будет отправлен для копирования
  const caseTemplate = 
    `Кто подает: \n` +
    `На кого: \n` +
    `Что произошло: \n` +
    `Дополнительная информация: \n` +
    `Требования: `;

  // Отправляем сообщение с кнопкой для копирования
  bot.sendMessage(
    chatId,
    `Чтобы подать заявление в суд, заполните анкету в следующем формате:\n` +         `Кто подает: Ваше имя\n` +
    `На кого: Ответчик\n` +
    `Что произошло: Краткое описание\n` +
    `Дополнительная информация: Детали\n` +
    `Требования: Ваши требования`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Копировать образец(текст снизу можно скопировать нажатием)",
              callback_data: "copy_template"
            }
          ]
        ]
      }
    }
  );

  // Слушаем нажатие на кнопку
  bot.on('callback_query', (query) => {
    if (query.data === 'copy_template') {
      // Отправляем текст шаблона пользователю
      bot.sendMessage(chatId, `\`${caseTemplate}\``, { parse_mode: 'Markdown' });
    }
  });
});

// Проверка формата заявления в суд
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const courtFormatRegex =
    /Кто подает: (.+)\nНа кого: (.+)\nЧто произошло: (.+)\nДополнительная информация: (.+)\nТребования: (.+)/;

  if (courtFormatRegex.test(text)) {
    const match = text.match(courtFormatRegex);
    const courtData = {
      plaintiff: match[1],
      defendant: match[2],
      description: match[3],
      details: match[4],
      demands: match[5],
    };


    bot.sendMessage(
      adminChatId,
      `Новая заявка в суд:\n\n` +
        `Кто подает: ${courtData.plaintiff}\n` +
        `На кого: ${courtData.defendant}\n` +
        `Что произошло: ${courtData.description}\n` +
        `Дополнительная информация: ${courtData.details}\n` +
        `Требования: ${courtData.demands}`
    );

    bot.sendMessage(chatId, '✅ Ваше заявление в суд успешно отправлено!');
  }
});
// Команда /start
// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  const message = `Привет! Добро пожаловать в бота! Используйте встроенную клавиатуру ниже для выбора команды.\n\n` +
  `Информация о боте: /info\n` +
  `Подать дело в суд: /submit_case\n` +
  `Доставка: /оформить_доставку \n` +
  `Регистрация: /register @username\n`;

  bot.sendMessage(chatId, message, {
    reply_markup: {
      keyboard: [
        [{ text: '/submit_case' }], // Подать в суд
        [{ text: '/register @username' }],    // Регистрация
        [{ text: '/help' }],        // Помощь
        [{ text: '/оформить_доставку' }], // Доставка
      ],
      resize_keyboard: true, // Адаптивная клавиатура
      one_time_keyboard: false, // Клавиатура остается на экране
    },
  });
})


// Команда: /report_fine — Отчет по штрафам
bot.onText(/\/report_fine/, (msg) => {
  const chatId = msg.chat.id;

  if (!isWorker(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только для сотрудников.');
    return;
  }

  const { totalFines, totalPaid, totalCancelled, totalUnpaidAmount } = getFineStatistics();

  const report = `📊 Отчет по штрафам:\n\n` +
                 `- Всего выписано штрафов: ${totalFines}\n` +
                 `- Оплачено штрафов: ${totalPaid}\n` +
                 `- Аннулировано штрафов: ${totalCancelled}\n` +
                 `- Сумма неоплаченных штрафов: ${totalUnpaidAmount} ар\n`;

  bot.sendMessage(chatId, report, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔍 Топ должников', callback_data: 'top_debtors' }],
        [{ text: '❌ Закрыть', callback_data: 'close_report' }],
      ],
    },
  });
});

// Команда: /top_debtors — Топ должников
bot.onText(/\/top_debtors/, (msg) => {
  const chatId = msg.chat.id;

  if (!isWorker(chatId)) {
    bot.sendMessage(chatId, '🛑 Эта команда доступна только для сотрудников.');
    return;
  }

  const debtors = getTopDebtors();

  const response = debtors.length > 0
    ? '📋 Топ должников:\n\n' + debtors.map((debtor, i) => `${i + 1}. ${debtor.username}: ${debtor.amount} ар`).join('\n')
    : '✅ Все пользователи оплатили свои штрафы.';

  bot.sendMessage(chatId, response, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📊 Отчет по штрафам', callback_data: 'fine_report' }],
        [{ text: '❌ Закрыть', callback_data: 'close_report' }],
      ],
    },
  });
});

// Callback обработчик кнопок
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data === 'close_report') {
    bot.deleteMessage(chatId, callbackQuery.message.message_id).catch(() => {});
  } else if (data === 'fine_report') {
    bot.deleteMessage(chatId, callbackQuery.message.message_id).catch(() => {});
    bot.sendMessage(chatId, '/report_fine'); // Вызов отчета
  } else if (data === 'top_debtors') {
    bot.deleteMessage(chatId, callbackQuery.message.message_id).catch(() => {});
    bot.sendMessage(chatId, '/top_debtors'); // Вызов топа должников
  }

  bot.answerCallbackQuery(callbackQuery.id);
});

// Вспомогательные функции
function getFineStatistics() {
  let totalFines = 0;
  let totalPaid = 0;
  let totalCancelled = 0;
  let totalUnpaidAmount = 0;

  for (const userId in fines) {
    const userFines = fines[userId] || [];
    userFines.forEach((fine) => {
      totalFines++;
      if (fine.paid) totalPaid++;
      else if (fine.cancelled) totalCancelled++;
      else totalUnpaidAmount += fine.amount;
    });
  }

  return { totalFines, totalPaid, totalCancelled, totalUnpaidAmount };
}

function getTopDebtors() {
  const debtors = [];

  for (const userId in fines) {
    const userFines = fines[userId] || [];
    const unpaidAmount = userFines
      .filter(fine => !fine.paid && !fine.cancelled)
      .reduce((sum, fine) => sum + fine.amount, 0);

    if (unpaidAmount > 0) {
      debtors.push({ username: users[userId]?.username || `ID: ${userId}`, amount: unpaidAmount });
    }
  }

  return debtors.sort((a, b) => b.amount - a.amount).slice(0, 10);
}
bot.onText(/\/info/, (msg) => {
  const chatId = msg.chat.id;
  const infoMessage = 
    `🤖 <b>Информация о боте:</b>\n\n` +
    `Этот бот помогает оформить быструю доставку товаров или узнать штрафы (возможно временно не актуально). Для оформления заказа используйте команду /оформить_доставку и заполните анкету по указанному образцу.\n` + 
    `Другие команды доступны по команде /help.\n\n` +
    `Если у вас возникнут вопросы, напишите в Артику(@ArtikYaYa). Спасибо за использование нашего сервиса!`;

  bot.sendMessage(chatId, infoMessage, { parse_mode: "HTML" });
});


// Разрешённые ID пользователей для ограниченных команд
const allowedUserIds = [6343971096, 2030128216];

// Имя файла для хранения данных
const HISTORY_FILE = 'userHistory.json';

// Объект для хранения истории пользователей
let userHistory = {};

// Загрузка истории из файла
function loadHistory() {
    if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        userHistory = JSON.parse(data);
    }
}

// Сохранение истории в файл
function saveHistory() {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(userHistory, null, 2));
}

// Загрузить историю при запуске
loadHistory();

// Проверка доступа к ограниченным командам
function isAllowed(userId) {
    return allowedUserIds.includes(userId);
}

// Команда /add для добавления записи другому пользователю
bot.onText(/\/add (\d+) (.+)/, (msg, match) => {
    const userId = msg.from.id;

    if (!isAllowed(userId)) {
        return bot.sendMessage(userId, 'У вас нет доступа к этой команде.');
    }

    const targetUserId = parseInt(match[1], 10); // ID целевого пользователя
    const message = match[2]; // Сообщение

    if (!userHistory[targetUserId]) {
        userHistory[targetUserId] = [];
    }

    userHistory[targetUserId].push(message);
    saveHistory(); // Сохраняем изменения в файл
    bot.sendMessage(userId, `Запись добавлена для пользователя ${targetUserId}:\n"${message}"`);
});

// Команда /history для просмотра истории определённого пользователя
bot.onText(/\/history (\d+)/, (msg, match) => {
    const userId = msg.from.id;

    if (!isAllowed(userId)) {
        return bot.sendMessage(userId, 'У вас нет доступа к этой команде.');
    }

    const targetUserId = parseInt(match[1], 10); // ID целевого пользователя
    const history = userHistory[targetUserId] || [];

    if (history.length === 0) {
        return bot.sendMessage(userId, `У пользователя ${targetUserId} нет записей.`);
    }

    const historyText = history.map((item, index) => `${index + 1}. ${item}`).join('\n');
    bot.sendMessage(userId, `История пользователя ${targetUserId}:\n${historyText}`);
});

// Команда /clear для очистки истории определённого пользователя
bot.onText(/\/clear (\d+)/, (msg, match) => {
    const userId = msg.from.id;

    if (!isAllowed(userId)) {
        return bot.sendMessage(userId, 'У вас нет доступа к этой команде.');
    }

    const targetUserId = parseInt(match[1], 10); // ID целевого пользователя
    userHistory[targetUserId] = [];
    saveHistory(); // Сохраняем изменения в файл
    bot.sendMessage(userId, `История пользователя ${targetUserId} очищена.`);
});

// Команда /all для просмотра всех пользователей с историей
bot.onText(/\/all/, (msg) => {
    const userId = msg.from.id;

    if (!isAllowed(userId)) {
        return bot.sendMessage(userId, 'У вас нет доступа к этой команде.');
    }

    const usersWithHistory = Object.keys(userHistory)
        .filter((id) => userHistory[id] && userHistory[id].length > 0)
        .map((id) => `ID: ${id}, Записей: ${userHistory[id].length}`);

    if (usersWithHistory.length === 0) {
        return bot.sendMessage(userId, 'Ни у одного пользователя нет записей.');
    }

    const response = usersWithHistory.join('\n');
    bot.sendMessage(userId, `Пользователи с записями:\n${response}`);
});
