//основные модули
const express = require('express');
require('dotenv').config();
const app = express();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs/promises');

//пользовательские модули
const Database = require('./services/database-service.js');

const {
    randCode,
} = require('./utils/other');

const Time = require('./utils/time.js');
const QRCode = require('qrcode');

const {
    INIT_SQL_FILE,
    DB_FILE,
    CONFIG_FILE,
} = require('./consts/file-paths.js');

const config = require(CONFIG_FILE);

const writeInLogFile = require('./utils/writein-log-file.js');
const createState = require('./utils/create-state.js');
const textDayFormat = require('./utils/text-day-format.js');
const createButtons = require('./utils/create-buttons.js');
const validateMarkdown = require('./utils/validate-markdown.js');

//основная конфигурация
const PORT = process.env.PORT || 3030;
const TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME;
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

const db = new Database(DB_FILE);
const states = [];

//создаем бота
const bot = new TelegramBot(TOKEN, { polling: true });

//форматирование строк
String.prototype.format = function () {
    return this.replace(/ {2,}/g, ' ').replace(/((?=\n)\s+)|\n/g, '').replace(/\/n/g, '\n');
}

//обработчик команд
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    try {

        let invited_by_key;

        //контроль команды
        if (msg.text && msg.text.indexOf('/start ') !== -1) {
            const commandData = decodeCommand(msg.text);
            if (!commandData.invited_by && chatId === ADMIN_TELEGRAM_ID) {
                return await handleCommand(commandData);
            }
            else {
                invited_by_key = commandData.invited_by;
            }
        }

        //авторизация пользователя
        const authResult = await authUser(msg.from, invited_by_key);

        //недаучное создание пользователя, выход
        if (authResult instanceof Error) return;

        //поиск состояния
        let state = states.find(state => state.chatId === chatId);

        //проверка на нового пользователя
        if (authResult) {

            //чат администратора
            if (state.chatId === ADMIN_TELEGRAM_ID) {
                return await bot.sendMessage(chatId, '*Администратор распознан* ✔️\n\nВам доступна панель управления и персонализация 👇', state.options);
            }

            return await bot.sendMessage(chatId, config.start_message.format(), state.options);
        }

        // --- Блок ввода текста ---

        //ввод нового собыьтия
        if (state.action === 'add event') {
            return handleEventMenagment(state, msg.text);
        }

        //ввод нового мерча
        if (state.action === 'add merch') {
            return handleMerchMenagment(state, msg.text);
        }

        //обработка создания новой рассылки
        if (state.action === 'add mail') {
            return await handleMailMenagment(state, msg.text);
        }

        //обработка новой скидки
        if (state.action === 'add discount') {
            return await handleDiscountMenagment(state, msg.text);
        }

        //изменение приветсвенного сообщения
        if (state.action === 'edit start_message' && state.stepName === 'content') {
            return await handleStartMessagePage(state, msg.text);
        }
        //изменение страницы оплаты
        if (state.action === 'edit payment_page' && state.stepName === 'content') {
            return await handlePaymentPage(state, msg.text);
        }

        //изменение вклдаки "о нас"
        if (state.action === 'edit about_us' && state.stepName === 'content') {
            return await handleAboutUsPage(state, msg.text);
        }

        //участие в событии
        if (state.action === 'join event') {
            return await handleJoinEvent(state, msg.text);
        }

        //изменение скидки
        if (state.action === 'set inv_discount') {
            return await handleEditDiscount(state, msg.text);
        }

        //сообщение об начале диалога
        if (msg.text === '/start' && state) {
            return await bot.sendMessage(chatId, 'Вы уже начали диалог ✔️', state.options);
        }

        //личный кабинет авторизованного пользователя
        await bot.sendMessage(chatId, '❓Команда не распознана', state.options);
    }
    catch (err) {
        writeInLogFile(err);
        bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже ✊');
    }
})

//обработчик событий с клавиатурой
bot.on('callback_query', callback_handler);

//обработчик кнопок
async function callback_handler(msg) {
    let chatId = msg.message.chat.id, state;

    try {

        //сценарий авторизации
        const authResult = await authUser(msg.from);

        //недаучное создание пользователя, выход
        if (authResult instanceof Error) return;

        //инициализация состояния
        state = states.find(state => state.chatId === chatId);

        //проверка, что пользователь новый
        if (authResult) {

            //чат администратора
            if (chatId === ADMIN_TELEGRAM_ID) {
                return await bot.sendMessage(chatId, '*Администратор распознан* ✔️\n\nВам доступна панель управления и персонализация 👇', state.options);
            }

            return await bot.sendMessage(chatId, config.start_message.format(), state.options);
        }

        // ---------------------------- Обработка событий администратора -----------------------------

        //вкладка "события"
        if (msg.data === 'menage events' && state.action === 'default') {
            return await eventsMenageOptions(state);
        }

        //удаление выбраного события
        if (msg.data.indexOf('DeleteEvent') !== -1 && state.action === 'default') {
            const eventId = msg.data.split('=')[1];
            return await deleteEvent(state, eventId);
        }

        //обновление события
        if (msg.data.indexOf('EditEvent') !== -1 && state.action === 'default') {
            const eventId = msg.data.split('=')[1];

            const existEvent = await db.find('events', [[{ field: 'id', exacly: eventId }]], true);

            if (!existEvent) {
                return await bot.sendMessage(chatId, '*Событие не найдено* ✊', { parse_mode: 'Markdown' });
            }

            state.data.replaceEventId = eventId;
            msg.data = 'add event';
            return callback_handler(msg);
        }

        //добавление нового события
        if (msg.data === 'add event' && state.action === 'default') {
            //сценарий нового события
            state.action = 'add event';

            //кнопки отмены            
            const buttons = createButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }])

            state.recordStep('name', 'ℹ Введите название события', buttons);
            return state.executeLastStep();
        }

        //подтверждение события
        if (msg.data === 'confirm new event' && state.action === 'add event') {
            return await confirmNewEvent(state);
        }

        //рассылка нового мерча
        if (msg.data === 'notify' && state.action === 'add event') {
            return await notifyEvent(state);
        }

        //шаг назад в сценарии
        if (msg.data === 'step back' && state.action !== 'default' && state._steps.length > 1) {
            state.stepBack();
            state._actionHandleFunction(state);
            return;
        }

        // ---------------------------- Обработка статистики администратора -----------------------------

        //статистика сервера
        if (msg.data === 'stats' && state.action === 'default') {
            return await handleStatistics(state);
        }

        // ---------------------------- Управление заказами администратором -----------------------------

        if (msg.data === 'menage offers' && state.action === 'default') {
            return await offersMenageOptions(state);
        }

        // ---------------------------- Управление мерчами администартором -----------------------------

        //вкладка "Мерчи"
        if (msg.data === 'menage merch' && state.action === 'default') {
            return await merchMenageOptions(state);
        }

        //удаление выбраного события
        if (msg.data.indexOf('DeleteMerch') !== -1 && state.action === 'default') {
            const merchId = msg.data.split('=')[1];
            return await deleteMerch(state, merchId);
        }

        //обновление события
        if (msg.data.indexOf('EditMerch') !== -1 && state.action === 'default') {

            const merchId = msg.data.split('=')[1];

            //проверка на существование мерча
            const existMerch = await db.find('merch', [[{ field: 'id', exacly: merchId }]], true);

            if (!existMerch) {
                return await bot.sendMessage(state.chatId, '*Мерч не найден* ✊', { parse_mode: 'Markdown' });
            }

            state.data.replaceMerchId = merchId;
            msg.data = 'add merch';
            return callback_handler(msg);
        }

        //добавление нового события
        if (msg.data === 'add merch' && state.action === 'default') {
            //сценарий нового события
            state.action = 'add merch';

            //кнопки отмены            
            const buttons = createButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }])

            state.recordStep('name', 'ℹ Введите название мерча', buttons);
            return state.executeLastStep();
        }

        //подтверждение события
        if (msg.data === 'confirm new merch' && state.action === 'add merch') {
            return await confirmNewMerch(state);
        }

        //рассылка нового мерча
        if (msg.data === 'notify' && state.action === 'add merch') {
            return await notifyMerch(state);
        }

        // ---------------------------- Участники мероприятий администартор -----------------------------

        if (msg.data === 'EventOffers' && state.action === 'default') {
            return await participantsMenageOptions(state);
        }

        //показ участников мероприятия
        if (msg.data.indexOf('EventOffers') !== -1 && state.action === 'default') {
            const eventId = msg.data.split('=')[1];
            return await participantsList(state, eventId);
        }

        // ---------------------------- Управление рассылками администартор -----------------------------

        //вкладка "рассылки"
        if (msg.data === 'menage notify' && state.action === 'default') {
            return await mailingsMenageOptions(state);
        }

        //создание новой рассылки
        if (msg.data === 'add mail' && state.action === 'default') {
            state.action = 'add mail';

            const sendingMess = `📨 *Введите тип рассылки*/n/n
                *Периодическая* — постоянная рассылка, которая повторяется в указанный промижуток времени/n/n
                *Запланированная* — разовая рассылка, отправится автоматически в указанное время/n/n
                *Моментальная* — разовая рассылка, отправляется сразу
            `.format();

            //установка следующего шага
            state.recordStep('send type', sendingMess, createButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]));

            return state.executeLastStep();
        }

        //подтверждение рассылки
        if (msg.data === 'confirm new mail' && state.action === 'add mail') {
            return await confirmNewMail(state);
        }

        //удаление выбраного события
        if (msg.data.indexOf('DeleteMail') !== -1 && state.action === 'default') {
            const merchId = msg.data.split('=')[1];
            return await deleteMail(state, merchId);
        }

        //обновление события
        if (msg.data.indexOf('EditMail') !== -1 && state.action === 'default') {
            const mailingId = msg.data.split('=')[1];

            //проверка существования рассылки
            const existMailing = await db.find('mailings', [[{
                field: 'id',
                exacly: mailingId
            }]], true);

            if (!existMailing) return bot.sendMessage(chatId, '*Рассылка не найдена* ✊', { parse_mode: 'Markdown' });

            msg.data = 'add mail';
            state.data.replaceMailingId = mailingId;
            return callback_handler(msg);
        }

        // ---------------------------- Управление скидками администартор -----------------------------

        //управление
        if (msg.data === 'menage gifts' && state.action === 'default') {
            return await giftMenageOptions(state);
        }

        //создание
        if (msg.data === 'add discount' && state.action === 'default') {
            state.action = 'add discount';

            state.recordStep('name', 'ℹ Введите название скидки', createButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]))

            return state.executeLastStep();
        }

        //подтверждение скидки
        if (msg.data === 'confirm new discount' && state.action === 'add discount') {
            return await confirmNewDiscount(state);
        }

        //удаление выбраного скидки
        if (msg.data.indexOf('DeleteDiscount') !== -1 && state.action === 'default') {
            const discountId = msg.data.split('=')[1];
            return await deleteDiscount(state, discountId);
        }

        //обновление скидки
        if (msg.data.indexOf('EditDiscount') !== -1 && state.action === 'default') {
            const discountId = msg.data.split('=')[1];

            //проверка на существование скидки
            const discount = await db.find('discounts', [[{
                field: 'id',
                exacly: discountId
            }]], true);

            if (!discount) {
                return await bot.sendMessage(state.chatId, '*Скидка не найдена ✊*', { parse_mode: 'Markdown' });
            }

            state.data.replaceDiscountId = discountId;

            msg.data = 'add discount';
            return callback_handler(msg);
        }

        // ---------------------------- Подтверждение заказов администратор -----------------------------

        //подтверждение
        if (msg.data.indexOf('AcceptOffer') !== -1) {
            const offerValue = msg.data.split('=')[1];
            const [offerType, offerId] = offerValue.split(':');
            return await confirmOffer(state, offerType, offerId);
        }

        //Удаление
        if (msg.data.indexOf('DeleteOffer') !== -1) {
            const offerValue = msg.data.split('=')[1];
            const [offerType, offerId] = offerValue.split(':');
            return await deleteOffer(state, offerType, offerId);
        }

        // ---------------------------- Управление страницами администартор -----------------------------

        //вкладка "страницы"
        if (msg.data === 'menage pages' && state.action === 'default') {
            return await pagesMenageOptions(state);
        }

        //изменение страницы "Приветственное сообщение"
        if (msg.data === 'edit start_message' && state.action === 'default') {
            state.action = 'edit start_message';

            state.recordStep('content', 'ℹ Введите приветственное сообщение', createButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]))

            return state.executeLastStep();
        }

        //подтверждение изменения страницы "Приветственное сообщение"
        if (msg.data === 'confirm start_message' && state.action === 'edit start_message') {
            return await confirmStartMessage(state);
        }

        //изменение страницы "О нас"
        if (msg.data === 'edit about_us' && state.action === 'default') {
            state.action = 'edit about_us';

            state.recordStep('content', 'ℹ Введите новое содержание для вкладки "О нас"', createButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]))

            return state.executeLastStep();
        }

        //подтверждение изменения страницы "О нас"
        if (msg.data === 'confirm about_us' && state.action === 'edit about_us') {
            return await confirmAboutUs(state);
        }

        //изменение страницы "Оплата"
        if (msg.data === 'edit payment_page' && state.action === 'default') {
            state.action = 'edit payment_page';

            state.recordStep('content', 'ℹ Введите новое содержание для страницы "Оплата"', createButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]))

            return state.executeLastStep();
        }

        //подтверждение изменения страницы "Оплата"
        if (msg.data === 'confirm payment_page' && state.action === 'edit payment_page') {
            return await confirmPaymentPage(state);
        }

        //изменение скидки за приглашение
        if (msg.data === 'edit inv_discount' && state.action === 'default') {
            state.action = 'set inv_discount';
            state.options = createButtons([{ text: 'На главную 🔙', data: 'main menu' }]);

            return await bot.sendMessage(chatId, `ℹ *Введите скидку за приглашение*/n/n
            Приглашение=${config.invite_discount} Приглашенному=${config.for_invited_discount}
            `.format(), state.options);
        }

        // ---------------------------- Обработка событий пользователя ----------------------------

        //обработка моих мерчей
        if (msg.data === 'my merch' && state.action === 'default') {
            return await myMerchOffer(state);
        }

        //вкладка "Ближайщие события"
        if (msg.data === 'events' && state.action === 'default') {
            return await eventsList(state);
        }

        //участие в событии
        if (msg.data.indexOf('JoinEvent') !== -1 && state.action === 'default') {
            const eventId = msg.data.split('=')[1];
            return await selectEventToJoin(state, eventId);
        }

        //подтверждение участия в событии
        if (msg.data === 'confirm join_event' && state.action === 'join event') {
            state.data.username = msg.from.username;
            return await confirmJoinEvent(state);
        }

        // ------------------------------------ участикам ------------------------------------------

        //вкладка "Участникам"
        if (msg.data === 'member' && state.action === 'default') {
            return await myEventsHandler(state);
        }

        //вкладка "Мои мерчи"
        if (msg.data === 'merch' && state.action === 'default') {
            return await userMerchHandler(state);
        }

        //заказ мерча
        if (msg.data.indexOf('OfferMerch') !== -1 && state.action === 'default') {
            state.action = 'offer merch';
            return await offerMerch(state, msg.data.split('=')[1]);
        }

        //подтверждение заказа мерча
        if (msg.data === 'confirm' && state.action === 'offer merch') {
            state.data.username = msg.from.username;
            return await confirmOfferMerch(state);
        }

        //вкладка "Мои бонусы"
        if (msg.data === 'gifts') {
            return await menageUserGifts(state);
        }

        //вкладка "о нас"
        if (msg.data === 'about') {
            return bot.sendMessage(chatId, config.about_us.format(), state.options);
        }

        //вкладка "Главная"
        if (msg.data === 'main menu') {
            state.default();
            return bot.sendMessage(chatId, 'Вы на главной странице 👇', state.options);
        }

    }
    catch (err) {
        bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже ✊');
        writeInLogFile(err);
    }
}

//запуск сервера
app.listen(3030, '0.0.0.0', async () => {
    console.clear();
    await initConnection();
    await initMailingsTimers();
    writeInLogFile(`Сервер запущен на порту ${PORT || 3030} ✨`);
})