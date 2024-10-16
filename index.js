//основные модули
const express = require('express');
require('dotenv').config();
const app = express();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs/promises');

//пользовательские модули
const Database = require('./modules/database');
const { RandCode, WriteInLogFile, CreateState, TextDayFormat,
CreateButtons, ValidateMarkdown } = require('./modules/Other');
const config = require('./config.json');
const Time = require('./modules/Time');
const QRCode = require('qrcode');

//основная конфигурация
const PORT = process.env.PORT || 3030;
const TOKEN = process.env.BOT_TOKEN;
const BOT_USERNAME = process.env.BOT_USERNAME;
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);
const db = new Database('./database.db');
const states = [];

//создаем бота
const bot = new TelegramBot(TOKEN, { polling: true });

//форматирование строк
String.prototype.format = function () {
    return this.replace(/ {2,}/g, ' ').replace(/((?=\n)\s+)|\n/g, '').replace(/\/n/g, '\n');
}

function escapeMarkdown(text) {
    // Регулярное выражение для поиска символов, требующих экранирования в Markdown
    return text.replace(/([_*[\]()`])/g, '\\$1');
}

//обработчик команд
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    WriteInLogFile(chatId);

    try{

        let invited_by_key;

        //контроль команды
        if(msg.text.indexOf('/start ') !== -1){
            const commandData = decodeCommand(msg.text);
            if(!commandData.invited_by) {
                return await handleCommand(commandData);
            }
            else {
                invited_by_key = commandData.invited_by;
            }
        }

        //авторизация пользователя
        const isNewUser = await authUser(msg.from, msg.text, invited_by_key);
        
        //поиск состояния
        let state = states.find(state => state.chatId === chatId);

        //чат администратора
        if(state.chatId === ADMIN_TELEGRAM_ID && isNewUser){
            return bot.sendMessage(chatId, '*Администратор распознан* ✔️\n\nВам доступна панель управления и персонализация 👇', state.options);
        }

        //проверка, что пользователь новый
        if(isNewUser){
            return bot.sendMessage(chatId, config.start_message.format(), state.options);
        }

        // --- Блок ввода текста ---

        //ввод нового собыьтия
        if(state.action === 'add event'){
            return handleEventMenagment(state, msg.text);
        }

        //ввод нового мерча
        if(state.action === 'add merch'){
            return handleMerchMenagment(state, msg.text);
        }

        //обработка создания новой рассылки
        if(state.action === 'add mail'){
            return handleMailMenagment(state, msg.text);
        }

        //обработка новой скидки
        if(state.action === 'add discount'){
            return handleDiscountMenagment(state, msg.text);
        }

        //изменение приветсвенного сообщения
        if(state.action === 'edit start_message' && state.stepName === 'content'){
            return handleStartMessagePage(state, msg.text);
        }
        //изменение страницы оплаты
        if(state.action === 'edit payment_page' && state.stepName === 'content'){
            return handlePaymentPage(state, msg.text);
        }

        //изменение вклдаки "о нас"
        if(state.action === 'edit about_us' && state.stepName === 'content'){
            return handleAboutUsPage(state, msg.text);
        }

        //участие в событии
        if(state.action === 'join event'){
            return handleJoinEvent(state, msg.text);
        }

        //изменение скидки
        if(state.action === 'set inv_discount'){
            return await handleEditDiscount(state, msg.text);
        }

        //личный кабинет авторизованного пользователя
        bot.sendMessage(chatId, '❓Команда не распознана', state.options);
    }
    catch(err){
        WriteInLogFile(err);
        bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже ✊');
    }
})

//обработчик событий с клавиатурой
bot.on('callback_query', callback_handler);

//обработчик кнопок
async function callback_handler(msg){
    let chatId = msg.message.chat.id, state;

    try {

        //сценарий авторизации
        await authUser(msg.from);

        //инициализация состояния
        state = states.find(state => state.chatId === chatId);

        // ---------------------------- Обработка событий администратора -----------------------------

        //вкладка "события"
        if(msg.data === 'menage events' && state.action === 'default') {
            return await eventsMenageOptions(state);
        }

        //удаление выбраного события
        if(msg.data.indexOf('DeleteEvent') !== -1 && state.action === 'default'){
            const eventId = msg.data.split('=')[1];
            return await deleteEvent(state, eventId);
        }

        //обновление события
        if(msg.data.indexOf('EditEvent') !== -1 && state.action === 'default') {
            const eventId = msg.data.split('=')[1];

            const existEvent = await db.find('events', [[{field: 'id', exacly: eventId}]], true);

            if(!existEvent){
                return await bot.sendMessage(chatId, '*Событие не найдено* ✊', {parse_mode: 'Markdown'});
            }

            state.data.replaceEventId = eventId;
            msg.data = 'add event';
            return callback_handler(msg);
        }

        //добавление нового события
        if(msg.data === 'add event' && state.action === 'default') {
            //сценарий нового события
            state.action = 'add event';

            //кнопки отмены            
            const buttons = CreateButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }])

            state.recordStep('title', 'ℹ Введите название события', buttons);
            return state.executeLastStep();
        }

        //подтверждение события
        if(msg.data === 'confirm new event' && state.action === 'add event') {
            return await confirmNewEvent(state);
        }

        //рассылка нового мерча
        if(msg.data === 'notify' && state.action === 'add event') {
            return await notifyEvent(state);
        }
    
        //шаг назад в сценарии
        if(msg.data === 'step back' && state.action !== 'default' && state._steps.length > 1) {
            state.stepBack();
            state._actionHandleFunction(state);
            return;
        }

        // ---------------------------- Обработка статистики администратора -----------------------------
        
        //статистика сервера
        if(msg.data === 'stats' && state.action === 'default') {
            return await handleStatistics(state);
        }

        // ---------------------------- Управление заказами администратором -----------------------------

        if(msg.data === 'menage offers' && state.action === 'default') {
            return await offersMenageOptions(state);
        }

        // ---------------------------- Управление мерчами администартором -----------------------------

        //вкладка "Мерчи"
        if(msg.data === 'menage merch' && state.action === 'default') {
            return await merchMenageOptions(state);
        }

        //удаление выбраного события
        if(msg.data.indexOf('DeleteMerch') !== -1 && state.action === 'default'){
            const merchId = msg.data.split('=')[1];
            return await deleteMerch(state, merchId);
        }

        //обновление события
        if(msg.data.indexOf('EditMerch') !== -1 && state.action === 'default') {

            const merchId = msg.data.split('=')[1];

            //проверка на существование мерча
            const existMerch = await db.find('merch', [[{field: 'id', exacly: merchId}]], true);

            if(!existMerch){
                return await bot.sendMessage(state.chatId, '*Мерч не найден* ✊', {parse_mode: 'Markdown'});
            }

            state.data.replaceMerchId = merchId;
            msg.data = 'add merch';
            return callback_handler(msg);
        }

        //добавление нового события
        if(msg.data === 'add merch' && state.action === 'default') {
            //сценарий нового события
            state.action = 'add merch';

            //кнопки отмены            
            const buttons = CreateButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }])

            state.recordStep('title', 'ℹ Введите название мерча', buttons);
            return state.executeLastStep();
        }

        //подтверждение события
        if(msg.data === 'confirm new merch' && state.action === 'add merch') {
            return await confirmNewMerch(state);
        }

        //рассылка нового мерча
        if(msg.data === 'notify' && state.action === 'add merch') {
            return await notifyMerch(state);
        }

        // ---------------------------- Участники мероприятий администартор -----------------------------

        if(msg.data === 'participants' && state.action === 'default') {
            return await participantsMenageOptions(state);
        }

        //показ участников мероприятия
        if(msg.data.indexOf('participants') !== -1 && state.action === 'default') {
            const eventId = msg.data.split('=')[1];
            return await participantsList(state, eventId);
        }

        // ---------------------------- Управление рассылками администартор -----------------------------

        //вкладка "рассылки"
        if(msg.data === 'menage notify' && state.action === 'default') {
            return await mailingsMenageOptions(state);
        }
        
        //создание новой рассылки
        if(msg.data === 'add mail' && state.action === 'default') {
            state.action = 'add mail';
            
            const sendingMess = `📨 *Введите тип рассылки*/n/n
                *Периодическая* — постоянная рассылка, которая повторяется в указанный промижуток времени/n/n
                *Запланированная* — разовая рассылка, отправится автоматически в указанное время/n/n
                *Моментальная* — разовая рассылка, отправляется сразу
            `.format();

            //установка следующего шага
            state.recordStep('send type', sendingMess, CreateButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]));

            return state.executeLastStep();
        }

        //подтверждение рассылки
        if(msg.data === 'confirm new mail' && state.action === 'add mail') {
            return await confirmNewMail(state);
        }

        //удаление выбраного события
        if(msg.data.indexOf('DeleteMail') !== -1 && state.action === 'default'){
            const merchId = msg.data.split('=')[1];
            return await deleteMail(state, merchId);
        }

        //обновление события
        if(msg.data.indexOf('EditMail') !== -1 && state.action === 'default') {
            const mailingId = msg.data.split('=')[1];

            //проверка существования рассылки
            const existMailing = await db.find('mailings', [[{
                field: 'id',
                exacly: mailingId
            }]], true);

            if(!existMailing) return bot.sendMessage(chatId, '*Рассылка не найдена* ✊', {parse_mode: 'Markdown'});

            msg.data = 'add mail';
            state.data.replaceMailingId = mailingId;
            return callback_handler(msg);
        }

        // ---------------------------- Управление скидками администартор -----------------------------
        
        //управление
        if(msg.data === 'menage gifts' && state.action === 'default') {
            return await giftMenageOptions(state);
        }

        //создание
        if(msg.data === 'add discount' && state.action === 'default') {
            state.action = 'add discount';

            state.recordStep('title', 'ℹ Введите название скидки', CreateButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]))

            return state.executeLastStep();
        }

        //подтверждение скидки
        if(msg.data === 'confirm new discount' && state.action === 'add discount') {
            return await confirmNewDiscount(state);
        }

        //удаление выбраного скидки
        if(msg.data.indexOf('DeleteDiscount') !== -1 && state.action === 'default'){
            const discountId = msg.data.split('=')[1];
            return await deleteDiscount(state, discountId);
        }

        //обновление скидки
        if(msg.data.indexOf('EditDiscount') !== -1 && state.action === 'default') {
            const discountId = msg.data.split('=')[1];

            //проверка на существование скидки
            const discount = await db.find('discounts', [[{
                field: 'id',
                exacly: discountId
            }]], true);

            if(!discount){
                return await bot.sendMessage(state.chatId, '*Скидка не найдена ✊*', {parse_mode: 'Markdown'});
            }

            state.data.replaceDiscountId = discountId;

            msg.data = 'add discount';
            return callback_handler(msg);
        }

        // ---------------------------- Подтверждение заказов администратор -----------------------------

        //подтверждение
        if(msg.data.indexOf('AcceptOffer') !== -1) {
            const offerValue = msg.data.split('=')[1];
            const [offerType, offerId] = offerValue.split(':');
            return await confirmOffer(state, offerType, offerId);
        }

        //Удаление
        if(msg.data.indexOf('DeleteOffer') !== -1) {
            const offerValue = msg.data.split('=')[1];
            const [offerType, offerId] = offerValue.split(':');
            return await deleteOffer(state, offerType, offerId);
        }

        // ---------------------------- Управление страницами администартор -----------------------------

        //вкладка "страницы"
        if(msg.data === 'menage pages' && state.action === 'default') {
            return await pagesMenageOptions(state);
        }

        //изменение страницы "Приветственное сообщение"
        if(msg.data === 'edit start_message' && state.action === 'default') {
            state.action = 'edit start_message';

            state.recordStep('content', 'ℹ Введите приветственное сообщение', CreateButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]))

            return state.executeLastStep();
        }

        //подтверждение изменения страницы "Приветственное сообщение"
        if(msg.data === 'confirm start_message' && state.action === 'edit start_message') {
            return await confirmStartMessage(state);
        }

        //изменение страницы "О нас"
        if(msg.data === 'edit about_us' && state.action === 'default') {
            state.action = 'edit about_us';

            state.recordStep('content', 'ℹ Введите новое содержание для вкладки "О нас"', CreateButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]))

            return state.executeLastStep();
        }

        //подтверждение изменения страницы "О нас"
        if(msg.data === 'confirm about_us' && state.action === 'edit about_us') {
            return await confirmAboutUs(state);
        }

        //изменение страницы "Оплата"
        if(msg.data === 'edit payment_page' && state.action === 'default') {
            state.action = 'edit payment_page';

            state.recordStep('content', 'ℹ Введите новое содержание для страницы "Оплата"', CreateButtons([{
                text: 'Отменить ✖️',
                data: 'main menu'
            }]))

            return state.executeLastStep();
        }

        //подтверждение изменения страницы "Оплата"
        if(msg.data === 'confirm payment_page' && state.action === 'edit payment_page') {
            return await confirmPaymentPage(state);
        }

        //изменение скидки за приглашение
        if(msg.data === 'edit inv_discount' && state.action === 'default') {
            state.action = 'set inv_discount';
            state.options = CreateButtons([{text: 'На главную 🔙', data: 'main menu'}]);

            return await bot.sendMessage(chatId, `ℹ *Введите скидку за приглашение*/n/n
            "Приглашение=${config.invite_discount} Приглашенному=${config.for_invited_discount}"
            `.format(), state.options);
        }    

        // ---------------------------- Обработка событий пользователя ----------------------------

        //обработка моих мерчей
        if(msg.data === 'my merch' && state.action === 'default') {
            return await myMerchOffer(state);
        }

        //вкладка "Ближайщие события"
        if(msg.data === 'events' && state.action === 'default') {
            return await eventsList(state);
        }

        //участие в событии
        if(msg.data.indexOf('JoinEvent') !== -1 && state.action === 'default'){
            const eventId = msg.data.split('=')[1];
            return await selectEventToJoin(state, eventId);
        }

        //подтверждение участия в событии
        if(msg.data === 'confirm join_event' && state.action === 'join event') {
            state.data.username = msg.from.username;
            return await confirmJoinEvent(state);
        }

        // ------------------------------------ участикам ------------------------------------------

        //вкладка "Участникам"
        if(msg.data === 'member' && state.action === 'default') {
            return await myEventsHandler(state);
        }

        //вкладка "Мои мерчи"
        if(msg.data === 'merch' && state.action === 'default') {
            return await userMerchHandler(state);
        }

        //заказ мерча
        if(msg.data.indexOf('OfferMerch') !== -1 && state.action === 'default') {
            state.action = 'offer merch';
            return await offerMerch(state, msg.data.split('=')[1]);
        }

        //подтверждение заказа мерча
        if(msg.data === 'confirm' && state.action === 'offer merch') {
            state.data.username = msg.from.username;
            return await confirmOfferMerch(state);
        }

        //вкладка "Мои бонусы"
        if(msg.data === 'gifts') {
            return await menageUserGifts(state);
        }

        //вкладка "о нас"
        if(msg.data === 'about') {
            return bot.sendMessage(chatId, config.about_us.format(), state.options);
        }

        //вкладка "Главная"
        if(msg.data === 'main menu'){
            state.default();
            return bot.sendMessage(chatId, 'Вы на главной странице 👇', state.options);
        }
        
    }
    catch(err){
        bot.sendMessage(chatId, 'Что-то пошло не так. Попробуйте позже ✊');
        WriteInLogFile(err);
    }
}

//получение базы данных (zip)
app.get('/database', (req, res) => {
    res.sendFile(__dirname + '/database.db');
});

//атворизация пользователя
async function authUser(sender, messageText = '', invited_by_key){

    //проверка существования аккаунта
    let userData = await db.find('users', [[{
        field: 'telegram_id',
        exacly: sender.id
    }]], true);

    //флаг нового пользователя
    let isNewUser = false;

    //регистрация пользователя
    if(!userData){

        const userId = await userRegistration(sender.id, sender.username, sender.first_name, invited_by_key);

        //данные о новом пользователе
        userData = await db.find('users', [[{
            field: 'telegram_id',
            exacly: userId
        }]], true);

        isNewUser = true;  
    }

    //инициализация состояния
    initState(userData);
    return isNewUser;
}

//инициадизация состояния
function initState(userData){
    //добавление состояние в случае отсутсвия
    if(!states.find(item => item.chatId === userData.telegram_id)){
        //опции пользовательского меню
        const options = userData.telegram_id === ADMIN_TELEGRAM_ID ? adminOptions() : userMainOptions()
        const state = CreateState(userData, bot);
        state.options = options;

        //состояние
        states.push(state);
    }
}

//обработка команды
async function handleCommand(commandData){

    const allowedCommands = ['ConfirmMerch', 'ConfirmJoinEvent'];

    if(!allowedCommands.includes(Object.keys(commandData)[0])){
        return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Недопустимая команда`);
    }

    if(!Object.values(commandData)[0]){
        return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Команда не имеет значения`);
    }

    if(Object.keys(commandData)[0] === 'ConfirmMerch'){
        const thisReciveKey = commandData.ConfirmMerch;
        const checkOffer = await db.find('merch_offers', [[{
            field: 'recive_key',
            exacly: thisReciveKey
        }]], true);

        if(!checkOffer){
            return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Заказ не найден`);
        }

        const thisUser = await db.find('users', [[{ field: 'telegram_id', exacly: checkOffer.telegram_id}]], true);

        await db.delete('merch_offers', [[{field: 'recive_key', exacly: thisReciveKey}]]);

        await bot.sendMessage(ADMIN_TELEGRAM_ID, `
            *Подпись подленная* ✔️/n/n
            *Мерч:* "${checkOffer.title}"/n
            *От:* @${escapeMarkdown(thisUser.username)} ${thisUser.nickname}/n
            *Оплатил:* ${checkOffer.toPay} ₽/n/n
            *Заказан:* ${new Time(checkOffer.created_at).toFormattedString(false)}/n
            *Заказ закрыт* ✊
        `.format(), {parse_mode: 'Markdown'});

        return await bot.sendMessage(thisUser.telegram_id, `*Ваш заказ на мерч "${checkOffer.title}" закрыт* ✔️`, {parse_mode: 'Markdown'});
    }

    if(Object.keys(commandData)[0] === 'ConfirmJoinEvent'){
        const thisReciveKey = commandData.ConfirmJoinEvent;
        const checkOffer = await db.find('event_offers', [[{
            field: 'recive_key',
            exacly: thisReciveKey
        }]], true);

        if(!checkOffer){
            return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Заказ не найден`);
        }

        const thisUser = await db.find('users', [[{ field: 'telegram_id', exacly: checkOffer.telegram_id}]], true);

        await db.delete('event_offers', [[{field: 'recive_key', exacly: thisReciveKey}]]);

        await bot.sendMessage(ADMIN_TELEGRAM_ID, `
            *Подпись подленная* ✔️/n/n
            *Событие:* "${checkOffer.title}"/n
            *ФИО участника:* "${checkOffer.full_name}"/n
            *От:* @${escapeMarkdown(thisUser.username)} ${thisUser.nickname}/n
            *Оплатил:* ${checkOffer.toPay} ₽/n/n
            *Заказан:* ${new Time(checkOffer.created_at).toFormattedString(false)}/n
            *Заказ закрыт* ✊
        `.format(), {parse_mode: 'Markdown'});

        return await bot.sendMessage(thisUser.telegram_id, `*Ваш заказ на событие "${checkOffer.title}" закрыт* ✔️`, {parse_mode: 'Markdown'});
    }
}

//расшифровка команды
function decodeCommand(message){

    //команда
    let base64command = message.split(/start\s+/g)[1], command = {};

    //проверк команды
    if(base64command){
        try{
            let commandParts = atob(base64command).split('=');
            command[commandParts[0]] = commandParts[1];
        }
        catch(err){
            WriteInLogFile(`Команда ${base64command} не может быть расшифрована`);
        }
    }

    return command;
}

//создание пользовательских опций
function adminOptions(){
    //кнопки пользовательского меню
    return CreateButtons([{
        text: 'События 🔥',
        data: 'menage events'
    },
    {
        text: 'Статистика 📈',
        data: 'stats'
    },
    {
        text: 'Заказы ℹ',
        data: 'menage offers'
    },
    {
        text: 'Мерчи 👑',
        data: 'menage merch'
    },
    {
        text: 'Участники 🏆',
        data: 'participants'
    },
    {
        text: 'Рассылки 📨',
        data: 'menage notify'
    },
    {
        text: 'Страницы 📃',
        data: 'menage pages'
    }, 
    {
        text: 'Скидки 💯',
        data: 'menage gifts'
    }
]);
}

//создание пользовательских опций
function userMainOptions(){
    //кнопки пользовательского меню
    return CreateButtons([{
        text: 'Ближайшие события 🔥',
        data: 'events'
    },
    {
        text: 'Заказать мерч 🐾',
        data: 'merch'
    },
    {
        text: 'Участникам 🏆',
        data: 'member'
    },
    {
        text: 'Мои мерчи ✊',
        data: 'my merch'
    },
    {
        text: 'Мои бонусы 💯',
        data: 'gifts'
    },
    {
        text: 'О нас 🤝',
        data: 'about'
    }]);
}

// Функция для подключения базы данных
async function initConnection(){ 
    try{
        await db.connect('database.db', 'init.sql');
    }
    catch(err){
        WriteInLogFile(err);
        throw err;
    }
}

//регистрация нового пользователя
async function userRegistration(telegram_id, username, nickname, invited_by_key){

    //проверка наличия имени пользователя в телеграме
    if(!username){
        return await bot.sendMessage(chatId, `Похоже, что при регистрации вы не указывали имя для связи с вами в телеграме 👇/n/n
        Перейдите в "настройки" - "мой аккаунт" - "имя пользователя" заполните поле и продолжите`.format(), CreateButtons([{
            text: 'готово 👌',
            data: 'default'
        }]));
    }
    
    let invited_by, discount = 0, existInvitedBy;

    if(invited_by_key){    
        existInvitedBy = await db.find('users', [[{field: 'invite_code', exacly: invited_by_key}]], true);
        if(existInvitedBy) {
            invited_by = existInvitedBy.telegram_id;
            discount = config.for_invited_discount;
        }
    }

    //будущий инвайт код
    let invite_code = RandCode(6);

    //поиск пользователя с таким кодом
    while(await db.find('users', [[{field: 'invite_code', exacly: invite_code}]], true)) {
        invite_code = RandCode(6);
    }

    //данные для регистрации
    const newUserData = {
        telegram_id,
        invite_code,
        invited_by,
        username,
        discount,
        nickname
    }

    //регистрация пользователя
    return await db.insert('users', newUserData);
}

//просмотр событий
async function eventsMenageOptions(state){
    const allEvents = await db.find('events');

    const timeNow = new Time().shortUnix();

    //информация об отсутствии событий
    if(!allEvents.length){
        await bot.sendMessage(state.chatId, '*В ближайшее время событий не запланировано* ✊', {parse_mode: 'Markdown'});
    }

    //отправка всех событий
    for(let event of allEvents){

        //кнопки управления событиями
        const eventsControlButtons = CreateButtons([{
            text: 'Пересоздать 🔁',
            data: 'EditEvent=' + event.id
        }, {
            text: 'Удалить ✖️',
            data: 'DeleteEvent=' + event.id
        }])

        await bot.sendMessage(state.chatId, `
            *№${event.id} — ${event.title}*/n/n
            📅 *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
            🔻 *Место проведения:* ${event.place}/n
            🥊 *Весовая категория:* от ${event.weight_from} до ${event.weight_to} кг/n
            ${event.event_date < timeNow ? '*ℹ️ Событие прошло*/n' : ''}/n
            ${event.content}
        `.format(), eventsControlButtons);
    }

    //кнопка добавления нового события
    state.options = CreateButtons([{
        text: 'Создать новое событие ➕',
        data: 'add event'
    },{
        text: 'На главную 🔙',
        data: 'main menu'
    }]);

    //добавить новый заказ
    return bot.sendMessage(state.chatId, '*Вы также можете добавить новое событие 👇*', state.options);
}

//удаление события
async function deleteEvent(state, eventId){

    //проверка существования события
    const existEvent = await db.find('events', [[{field: 'id', exacly: eventId}]], true);

    if(!existEvent){
        return await bot.sendMessage(state.chatId, '*Событие не найдено* ✊', {parse_mode: 'Markdown'});
    }

    //удаление из базы данных
    await db.delete('events', [[{
        field: 'id',
        exacly: eventId
    }]]);

    bot.sendMessage(state.chatId, `*Событие №${eventId} удалено ✔️*`, state.options);
}

//удаление мерча
async function deleteMerch(state, merchId){

    //проверка на сущуствование мерча
    const existMerch = await db.find('merch', [[{field: 'id', exacly: merchId}]], true);

    if(!existMerch){
        return await bot.sendMessage(state.chatId, '*Мерч не найден* ✊', {parse_mode: 'Markdown'});
    }

    //удаление из базы данных
    await db.delete('merch', [[{
        field: 'id',
        exacly: merchId
    }]]);

    bot.sendMessage(state.chatId, `*Мерч №${merchId} удален ✔️*`, state.options);
}

//обработка заполнения нового события
function handleEventMenagment(state, message){

    if(message && ValidateMarkdown(message)){
        const warnMessage = `🔁 *${ValidateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    //указание названия события
    if(state.stepName === 'title'){

        //проверка ввода
        if(!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название события', state.options);
        }

        //установка названия события
        state.data.newEventData = {
            title: message
        }
        
        //устанавливает функцию - обработчик
        state._actionHandleFunction = handleEventMenagment;

        //установка следующего шага
        state.recordStep('place', '🔻 Введите место проведения', CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]))

        return state.executeLastStep();
    }

    //указание места проведения
    if(state.stepName === 'place'){

        //проверка ввода
        if(!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите место проведения', state.options);
        }

        //установка места
        state.data.newEventData.place = message;

        //установка следующего шага
        state.recordStep('weight', '🥊 Введите весовую категорию "от n и до m" (кг)', state.options);
        return  state.executeLastStep();
    }

    //указание весовой категории
    if(state.stepName === 'weight'){

        //проверка на ввод от и до
        if(!message || !message.match(/^От\s\d+\sдо\s\d+$/gi)){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите весовую категорию от n и до m', state.options);
        }

        //установка весовой категории
        state.data.newEventData.weight_from = message.match(/\s\d+\s/)[0].trim();

        //установка весовой категории
        state.data.newEventData.weight_to = message.match(/\s\d+$/)[0].trim();

        //установка следующего шага
        state.recordStep('date', '📅 Введите планируемую дату события\n\nВ формате: *"чч.мм.гггг чч:мм"*', state.options);
        return state.executeLastStep();
    }

    //указание даты проведения
    if(state.stepName === 'date'){

        //проверка ввода даты
        if(!message || !Time.isValid(message) || new Time().shortUnix() > new Time(message).shortUnix()) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите дату события\n\nВ формате: *"чч.мм.гггг чч:мм"*', state.options);
        }

        //установка даты проведения
        state.data.newEventData.event_date = new Time(message).shortUnix();

        //установка следующего шага
        state.recordStep('price', '💸 Введите цену за участие в рублях ₽', state.options);
        return state.executeLastStep();
    }

    //указание даты проведения
    if(state.stepName === 'price'){

        //проверка ввода даты
        if(!message || isNaN(message) || Number(message) <= 0 ) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите цену за участие в рублях ₽', state.options);
        }

        //установка даты проведения
        state.data.newEventData.price = message;

        //установка следующего шага
        state.recordStep('content', '🤳 Введите пост о мероприятии', state.options);
        return state.executeLastStep();
    }

    //указание поста события
    if(state.stepName === 'content'){

        //проверка ввода
        if(!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите пост о мероприятии', state.options);
        }

        //установка даты проведения
        state.data.newEventData.content = message;

        //финальные кнопки управления
        const buttons = CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        },{
            text: 'Подвердить ✔️',
            data: 'confirm new event'
        }]);

        //установка следующего шага
        state.recordStep('confirm new event', `
            *${state.data.newEventData.title}*/n/n
            📅 *Дата проведения:* ${(new Time(state.data.newEventData.event_date)).toFriendlyString()}/n
            🔻 *Место проведения:* ${state.data.newEventData.place}/n
            🥊 *Весовая категория:* ${state.data.newEventData.weight_from} до ${state.data.newEventData.weight_to} кг/n
            🫰 *Цена за участие:* ${state.data.newEventData.price} ₽/n/n
            ${state.data.newEventData.content}
        `.format(), buttons);

        //выполнение шага
        return state.executeLastStep();
    }
}

//просмотр событий
async function merchMenageOptions(state){
    const allMerch = await db.find('merch');

    //информация об отсутствии событий
    if(!allMerch.length){
        await bot.sendMessage(state.chatId, '*Мерчи отсутствуют* ✊', {parse_mode: 'Markdown'});
    }

    //отправка всех событий
    for(let merch of allMerch){

        //кнопки управления событиями
        const merchControlButtons = CreateButtons([{
            text: 'Пересоздать 🔁',
            data: 'EditMerch=' + merch.id
        }, {
            text: 'Удалить ✖️',
            data: 'DeleteMerch=' + merch.id
        }])

        await bot.sendMessage(state.chatId, `
            *${merch.title}  —  №${merch.id}*/n
            *Цена:* ${merch.price} ₽/n/n
            ${merch.content}
        `.format(), merchControlButtons);
    }

    //кнопка добавления нового события
    state.options = CreateButtons([{
        text: 'Создать новый мерч ➕',
        data: 'add merch'
    },{
        text: 'На главную 🔙',
        data: 'main menu'
    }]);

    //добавить новый заказ
    return bot.sendMessage(state.chatId, '*Вы также можете добавить новый мерч 👇*', state.options);
}

//выбор мероприятия для участия
async function selectEventToJoin(state, eventId){

    //проверка на участие или подание заявки
    const existOffer = await db.find('event_offers', [[{
        field: 'telegram_id',
        exacly: state.chatId
    }, {
        field: 'event_id',
        exacly: eventId
    }]], true);

    if(existOffer){
        state.default();
        return await bot.sendMessage(state.chatId, '*ℹ️ Вы уже участвуете в этом мероприятии*', state.options);
    }

    state.action = 'join event';
    state.data.id = eventId;

    const buttons = CreateButtons([{
        text: 'Отменить ✖️',
        data: 'main menu'
    }])

    state.recordStep('fullname', 'ℹ Введите вашу фамилию, имя и отчество (при наличии)', buttons);
    return state.executeLastStep();
}

//обработка заполнения мерча
function handleMerchMenagment(state, message){

    if(message && ValidateMarkdown(message)){
        const warnMessage = `🔁 *${ValidateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    //указание названия события
    if(state.stepName === 'title'){

        //проверка ввода
        if(!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название для мерча', state.options);
        }

        //установка названия события
        state.data.newMerchData = {
            title: message
        }
        
        //устанавливает функцию - обработчик
        state._actionHandleFunction = handleMerchMenagment;

        //установка следующего шага
        state.recordStep('price', '💸 Введите цену за покупку в рублях ₽', CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]))

        return state.executeLastStep();
    }

    //указание даты проведения
    if(state.stepName === 'price'){

        //проверка ввода даты
        if(!message || isNaN(message) || Number(message) <= 0 ) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите цену за покупку в рублях ₽', state.options);
        }

        //установка даты проведения
        state.data.newMerchData.price = message;

        //установка следующего шага
        state.recordStep('content', '🤳 Введите пост о мерче', state.options);
        return state.executeLastStep();
    }

    //указание поста события
    if(state.stepName === 'content'){

        //проверка ввода
        if(!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите пост о мерче', state.options);
        }

        //установка даты проведения
        state.data.newMerchData.content = message;

        //финальные кнопки управления
        const buttons = CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        },{
            text: 'Подвердить ✔️',
            data: 'confirm new merch'
        }]);

        //установка следующего шага
        state.recordStep('confirm new merch', `
            *${state.data.newMerchData.title}*/n
            *Цена:* ${state.data.newMerchData.price} ₽/n/n
            ${state.data.newMerchData.content}
        `.format(), buttons);

        //выполнение шага
        return state.executeLastStep();
    }
}

//управление новой рассылкой
async function handleMailMenagment(state, message) {
    
    if(message && ValidateMarkdown(message)){
        const warnMessage = `🔁 *${ValidateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    //установка типа рассылки
    if(state.stepName === 'send type'){

        //значения
        const allowedValues = [
            'Периодическая',
            'Запланированная',
            'Моментальная'
        ];

        if(!allowedValues.includes(message)){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите тип рассылки\n\n(Периодическая/Запланированная/Моментальная)', state.options);
        }

        //установка данных
        state.data.newMailData = {
            send_type: message
        }

        //установка обарботчика
        state._actionHandleFunction = handleMailMenagment;

        //установка следующего шага
        state.recordStep('title', 'ℹ️ Введите название рассылки', CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]));

        return state.executeLastStep();
    }

    //название
    if(state.stepName === 'title'){

        if(!message){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название рассылки', state.options);
        }

        //установка данных
        state.data.newMailData.title = message;

        let varMessage;

        //если рассылка разовая, то перескочить к выбору аудитории
        if(state.data.newMailData.send_type === 'Моментальная'){
            //установка следующего шага
            state.recordStep('audience', 'ℹ️ Введите категорию для рассылки\n\nВсем/Участникам/Всем, кроме участников)', state.options);
            return state.executeLastStep();
        }
        else if(state.data.newMailData.send_type === 'Запланированная'){
            varMessage = 'ℹ️ Введите дату проведения рассылки/n/nВ формате *чч.мм.гг чч:мм*'.format();
        }
        else {
            varMessage = 'ℹ️ Введите период проведения рассылки в днях (не более 14)'.format();
        }

        state.data._dateAdviceMsg = varMessage;

        //установка следующего шага
        state.recordStep('date time', varMessage, state.options);
        return state.executeLastStep();
    }

    //дата проведения
    if(state.stepName === 'date time'){

        if(!message){
            return bot.sendMessage(state.chatId, state.data._dateAdviceMsg, state.options);
        }

        //обработка
        if(state.data.newMailData.send_type === 'Запланированная'){
            if(!Time.isValid(message)){
                return bot.sendMessage(state.chatId, `🔁 Пожалуйста, введите дату проведения рассылки/n/n
                В формате *чч.мм.гг чч:мм*    
                `.format(), state.options);
            }

            state.data.newMailData.response_time = new Time(message).shortUnix();
        }
        else {
            if(isNaN(message) || Number(message) <= 0 || Number(message) > 14){
                return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите период проведения рассылки в днях (не более 14)', state.options);
            }

            //ставить планируемое время в том числе и на переодические
            state.data.newMailData.repeats = message * 86400;
        }

        //установка следующего шага
        state.recordStep('audience', 'ℹ️ Введите категорию для рассылки\n\n(Всем/Участникам/Всем, кроме участников)', state.options);
        return state.executeLastStep();
    }

    //категория
    if(state.stepName === 'audience'){

        const allowedValues = [
            'Всем',
            'Участникам',
            'Всем, кроме участников'
        ];

        if(!allowedValues.includes(message)){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите категорию для рассылки\n\n(Всем/Участникам/Всем, кроме участников)', state.options);
        }

        //установка данных
        state.data.newMailData.audience = message;

        //установка следующего шага
        state.recordStep('content', 'ℹ️ Введите содержание рассылки', state.options);
        return state.executeLastStep();
    }

    //содержание
    if(state.stepName === 'content'){

        if(!message){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите содержание рассылки', state.options);
        }

        //установка данных
        state.data.newMailData.content = message;

        //финальные кнопки управления
        const buttons = CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        },{
            text: 'Подвердить ✔️',
            data: 'confirm new mail'
        }]);

        //строка даты
        const sendingStroke = state.data.newMailData.send_type === 'Моментальная' ? '' :
        state.data.newMailData.repeats ? `🔁 *Повторять каждые:* ${TextDayFormat(state.data.newMailData.repeats/86400)}/n` :
        `📅 *Отправка:* ${new Time(state.data.newMailData.response_time).toFriendlyString()}/n`

        //сообщение
        const sendingMess = `
            *${state.data.newMailData.title}*/n/n
            📨 *Тип рассылки:* ${state.data.newMailData.send_type}/n
            ${sendingStroke}
            👥 *Аудитория:* ${state.data.newMailData.audience}/n/n
            ${state.data.newMailData.content}
        `.format();

        //установка следующего шага
        state.recordStep('confirm new mail', sendingMess, buttons);

        //выполнение шага
        return state.executeLastStep();
    }
}

//создание новой скидки
async function handleDiscountMenagment(state, message){

    if(message && ValidateMarkdown(message)){
        const warnMessage = `🔁 *${ValidateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    //категория
    if(state.stepName === 'title'){

        if(!message){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название скидки', state.options);
        }

        //установка данных
        state.data.newDiscountData = {
            title: message
        }

        state._actionHandleFunction = handleDiscountMenagment;

        //установка следующего шага
        state.recordStep('discount', 'ℹ️ Введите значение скидки в процентах', CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]));
        return state.executeLastStep();
    }

    //значение
    if(state.stepName === 'discount'){
        if(isNaN(message) || message < 1 || message > 100){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите значение скидки в процентах', state.options);
        }

        //установка данных
        state.data.newDiscountData.discount = message;

        //установка следующего шага
        state.recordStep('category', 'ℹ️ Введите категорию скидки (Все/Участие/Мерчи)'.format(), state.options);
        return state.executeLastStep();
    }

    //категория
    if(state.stepName === 'category'){

        //проверка ввода
        const allowedValues = [
            'Все',
            'Участие',
            'Мерчи'
        ];

        if(!allowedValues.includes(message)){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите значение скидки в процентах', state.options);
        }

        //установка данных
        state.data.newDiscountData.category = message;

        //финальные кнопки управления
        const buttons = CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        },{
            text: 'Подвердить ✔️',
            data: 'confirm new discount'
        }]);

        //сообщение
        const sendingMess = `
            *${state.data.newDiscountData.title}*/n/n
            💯 *Скидка:* ${state.data.newDiscountData.discount}%/n
            ℹ *Категория:* ${state.data.newDiscountData.category}/n/n
        `.format();

        //установка следующего шага
        state.recordStep('confirm new discount', sendingMess, buttons);

        //выполнение шага
        return state.executeLastStep();
    }
}

//подтверждение рассылки
async function confirmNewMail(state){
    
    //проверка на моментальную
    if(state.data.newMailData.send_type === 'Моментальная'){
        await sendMail(state.data.newMailData);
        state.default();
        return bot.sendMessage(state.chatId, '*Рассылка выполнена ✔️*', state.options);
    }

    let message = '*Рассылка добавлена ✔️*';

    //обновление рассылки
    if(state.data.replaceMailingId){
        await db.update('mailings', state.data.newMailData, [[{
            field: 'id',
            exacly: state.data.replaceMailingId
        }]]);

        //обновление таймера изменненной рассылки
        updateMailingTimer(state.data.replaceMailingId);
        message = `*Рассылка №${state.data.replaceMailingId} обновлена ✔️*`;
    }
    else {

        //обновление таймера изменненной рассылки
        const newMailingId = await db.insert('mailings', state.data.newMailData);
        updateMailingTimer(newMailingId);
    }
    
    state.default();
    bot.sendMessage(state.chatId, message, state.options);
}

//скидки пользователя
async function menageUserGifts(state){

    //получение списка скидок
    let discounts = await db.find('discounts');

    //прверка пользователя на платный заказ
    const user = await db.find('users', [[{
        field: 'telegram_id',
        exacly: state.chatId
    }]], true)

    if(!discounts.length && !user.made_first_offer && !user.discount){
        return await bot.sendMessage(state.chatId, `*Сделайте первый заказ, чтобы получить реферальную ссылку и 
        получать больше крутых бонусов 🎁🎁🎁*`.format(), state.options);
    }

    let message = '', referalPart = '';

    if(user.made_first_offer){
        const base64UrlCommand = btoa(`invited_by=${user.invite_code}`);
        const urlCommand = `https://t.me/${BOT_USERNAME}?start=${base64UrlCommand}`;

        referalPart = `
        *Ваша реферальная ссылка 👇*/n\`\`\`${urlCommand}\`\`\`/n/n
        💯 *Ваша текущая скидка:* ${user.discount} %/n/n
        🎁 *Получайте скидку ${config.invite_discount} % за каждого друга, который оформит любой заказ по вашей реферальной ссылке. 
        Другу — ${config.for_invited_discount} %*/n/n
        `;
    }

    for(let item of discounts){
        message += `🎁 *${item.title}* на ${item.category.toLowerCase()} — скидка ${item.discount}%/n/n`;
    }

    if(!discounts.length && !user.made_first_offer){
        message += `💯 *Сделайте первый заказ, чтобы получить реферальную ссылку и 
        получать больше крутых бонусов!*/n/n🔥 *Ваша текущая скидка:* ${user.discount} % на все`;
    }

    await bot.sendMessage(state.chatId, (referalPart + message).format(), state.options);
}

//функция для рассыдки
async function sendMail(mail){

    let userToMail;

    //обрбаотка сценариев
    switch(mail.audience){
        case 'Всем': {
            const users = await db.find('users');
            userToMail = users;
            break;
        }
        case 'Участникам': {
            const participants = await db.find('event_offers');
            userToMail = participants;
            break;
        }
        case 'Всем, кроме участников': {
            const participants = await db.find('event_offers');
            const users = await db.find('users');
            userToMail = users.filter(user => !participants.some(participant => participant.telegram_id === user.telegram_id));
            break;
        }
    }

    //рассылка
    for(let user of userToMail){

        if(user.telegram_id === ADMIN_TELEGRAM_ID){
            continue
        }

        await bot.sendMessage(user.telegram_id, `
            *${mail.title}*/n/n
            ${mail.content}
        `.format(), {parse_mode: 'Markdown'});
    }
}

//участникам
async function myEventsHandler(state){
    const myEvents = await db.find('event_offers', [[{
        field: 'telegram_id',
        exacly: state.chatId
    }]]);

    if(!myEvents.length){
        bot.sendMessage(state.chatId, '*Вы пока нигде не учавствуете* ✊\n\nПодайте заявку во вкладке *"Ближайщие события"* 👇', state.options);
    }

    for(let item of myEvents){

        //событие
        const event = await db.find('events', [[{
            field: 'id',
            exacly: item.event_id
        }]], true);

        if(item.accepted){
                
            const base64UrlCommand = btoa(`ConfirmJoinEvent=${item.recive_key}`);
            const checkofferUrl = `https://t.me/${BOT_USERNAME}?start=${base64UrlCommand}`

            //генерация QR кода с библиотекой qr-code
            const qrCodeBuffer = await QRCode.toBuffer(checkofferUrl, {type: 'png'});

            //сообщение
            const message = `
                *Предъявите данный QR код на мероприятии*/n/n
                *${item.title}*/n
                *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
                *Место:* ${event.place}/n
                *Статус заявки:* Подтвержден ✔️
            `.format();

            //отправка QR кода
            await bot.sendPhoto(state.chatId, qrCodeBuffer, {
                caption: message,
                parse_mode: 'Markdown'
            });
        }
        else {
            //сообщение
            const message = `
                *${item.title}*/n
                *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
                *Место:* ${event.place}/n
                *Оплачено:* ${item.toPay} ₽/n
                *Статус заявки:* Ожидает подверждения/n/n
                ℹ *После одобрения заявки у вас появится QR код участиника*
            `.format();

            await bot.sendMessage(state.chatId, message, {parse_mode: 'Markdown'});
        }
    }

    await bot.sendMessage(state.chatId, '*Здесь отображены ваши заявки на мероприятия*', CreateButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

//рассылка нового мерча
async function notifyMerch(state){

    //получение этого мерча
    const merch = await db.find('merch', [[{
        field: 'id',
        exacly: state.data.id
    }]], true)

    const mailData = {
        audience: 'Всем',
        title: `У нас пополнение ассортимента — ${merch.title} 🔥`,
        content: `${merch.content}/n/n*Заказать можно во вкладке "Мои мерчи"*`
    }

    await sendMail(mailData);
    state.default();
    await bot.sendMessage(state.chatId, '*Рассылка выполнена ✔️*', state.options);
}

//рассылка нового события
async function notifyEvent(state){

    //получение этого мерча
    const event = await db.find('events', [[{
        field: 'id',
        exacly: state.data.id
    }]], true)

    const mailData = {
        audience: 'Всем',
        title: `У нас новое событие — ${event.title} 🔥`,
        content: `
        📅 *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
        🔻 *Место:* ${event.place}/n
        🥊 *Весовая категория:* от ${event.weight_from} до ${event.weight_to} кг/n/n
        ${event.content}/n/n*Принять участие можно во вкладке "Ближайшие события"*`
    }

    await sendMail(mailData);
    state.default();
    await bot.sendMessage(state.chatId, '*Рассылка выполнена ✔️*', state.options);
}

//подтверждение события
async function confirmNewMerch(state){

    //обновление мероприятия
    if(state.data.replaceMerchId){
        await db.update('merch', state.data.newMerchData, [[{
            field: 'id',
            exacly: state.data.replaceMerchId
        }]]);

        state.default();
        bot.sendMessage(state.chatId, `*Мерч №${state.data.replaceMerchId} обновлен ✔️*`, state.options);
    }
    //добавление нового события
    else {
        //кнопки  рассылки
        state.data.id = await db.insert('merch', state.data.newMerchData);
        state.recordStep('notify', '*Мерч добавлен ✔️*', CreateButtons([{
            text: 'Сделать рассылку мерча 📨',
            data: 'notify'
        },{
            text: 'На главную 🔙',
            data: 'main menu'
        }]));

        //выполнение шага
        state.executeLastStep();
    }
}

//подтверждение скидки
async function confirmNewDiscount(state){

    let message = '';

    if(state.data.replaceDiscountId){
        await db.update('discounts', state.data.newDiscountData, [[{
            field: 'id',
            exacly: state.data.replaceDiscountId
        }]]);

        message = `*Скидка №${state.data.replaceDiscountId} обновлена ✔️*`;
    }
    else {
        await db.insert('discounts', state.data.newDiscountData);
        message = '*Скидка добавлена ✔️*';
    }

    state.default();
    bot.sendMessage(state.chatId, message, state.options);
}

//удаление скидки
async function deleteDiscount(state, discountId){

    //проверка на существование скидки
    const discount = await db.find('discounts', [[{field: 'id',exacly: discountId}]], true);

    if(!discount){
        return await bot.sendMessage(state.chatId, '*Скидка не найдена ✊*', {parse_mode: 'Markdown'});
    }

    await db.delete('discounts', [[{
        field: 'id',
        exacly: discountId
    }]]);

    state.default();
    bot.sendMessage(state.chatId, `*Скидка №${discountId} удалена ✔️*`, state.options);
}

//подтверждение приветсвенного сообщения
async function confirmStartMessage(state){
    //обновление приветсвенного сообщения
    config.start_message = state.data.newStartMessage.content;

    //обновление config.json
    await fs.writeFile('./config.json', JSON.stringify(config, null, 2));

    state.default();
    bot.sendMessage(state.chatId, `*Приветсвенное сообщение обновлено ✔️*`, state.options);
}

//подтверждение вкладки "О нас"
async function confirmAboutUs(state){
    //обновление приветсвенного сообщения
    config.about_us = state.data.newAboutUs.content;

    //обновление config.json
    await fs.writeFile('./config.json', JSON.stringify(config, null, 2));

    state.default();
    bot.sendMessage(state.chatId, `*Вкладка "О нас" обновлена ✔️*`, state.options);
}

//подтверждение вкладки "Оплата"
async function confirmPaymentPage(state){
    //обновление приветсвенного сообщения
    config.payment_page = state.data.newPaymentPage.content;

    //обновление config.json
    await fs.writeFile('./config.json', JSON.stringify(config, null, 2));

    state.default();
    bot.sendMessage(state.chatId, `*Страница "Оплата" обновлена ✔️*`, state.options);
}

//подтверждение события
async function confirmNewEvent(state){
    
    //обновление мероприятия
    if(state.data.replaceEventId){
        await db.update('events', state.data.newEventData, [[{
            field: 'id',
            exacly: state.data.replaceEventId
        }]]);

        bot.sendMessage(state.chatId, `*Событие №${state.data.replaceEventId} обновлено ✔️*`, state.options);
        state.default();
    }
    //добавление нового события
    else {
        //кнопки  рассылки
        state.data.id = await db.insert('events', state.data.newEventData);
        state.recordStep('notify', '*Событие добавлено ✔️*', CreateButtons([{
            text: 'Сделать рассылку события 📨',
            data: 'notify'
        },{
            text: 'На главную 🔙',
            data: 'main menu'
        }]));

        //выполнение шага
        state.executeLastStep();
    }
}

//управление заказами
async function offersMenageOptions(state){
    const merchOffers = (await db.executeWithReturning('SELECT * FROM merch_offers')).map(item => ({...item, type: 'merch'}));
    const eventOffers = (await db.executeWithReturning('SELECT * FROM event_offers')).map(item => ({...item, type: 'event'}));
    const totalOffers = [...merchOffers, ...eventOffers];
    //вывод заказов, отсартированных по полю accepted 0
    const sortedOffers = totalOffers.sort((a, b) => a.accepted - b.accepted);

    //если заказов нет
    if(!sortedOffers.length){
        return bot.sendMessage(state.chatId, '*Заказов не найдено* ✊', {parse_mode: 'Markdown'});
    }

    //вывод всех заказов
    for(let offer of sortedOffers){

        const offerUser = await db.find('users', [[{
            field: 'telegram_id',
            exacly: offer.telegram_id
        }]], true);

        let buttons;
        const offerTypeCase = offer.type === 'merch' ? 'на мерч' : 'на участие в мероприятии';

        //сообщение
        const message = `*Заказ ${offerTypeCase} №${offer.id}: "${offer.title}"*/n/n
        *Статус:* ${offer.accepted ? 'подтвержден ✔️' : 'Ожидает вашего подверждения ℹ'}/n
        *К оплате:* ${offer.toPay} ₽/n/n
        👤 *От:* @${escapeMarkdown(offerUser.username)}/n
        `.format();

        //кнопки управления заказами
        if(!offer.accepted){

            //кнопки на подтверждение
            buttons = CreateButtons([{
                text: 'Подтвердить ✔️',
                data: `AcceptOffer=${offer.type}:${offer.id}`
            },{
                text: 'Отказать ✖️',
                data: `DeleteOffer=${offer.type}:${offer.id}`
            }], false);

        }

        //управление
        await bot.sendMessage(state.chatId, message, buttons || CreateButtons([{
            text: 'Удалить заказ ✖️',
            data: `DeleteOffer=${offer.type}:${offer.id}`
        }]));
    }

    state.options = CreateButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }])

    await bot.sendMessage(state.chatId, `ℹ *Удалить заказ можно после его подтверждения.*/n
    Рекомендуется это делать только после участия или получения мерча. 
    В случае отказа заказ будет автоматически удален./n/n
    Рекомендуется проверять заказы пользователей на подленнсть с предоставлением их QR-кода. 
    После считывания вам будет доступна подробная информация о заявке, и заказ будет автоматически закрыт.`.format(), state.options);
}

//статистика сервера
async function handleStatistics(state){

    //получение данных
    const totalUsers = await db.executeWithReturning('SELECT COUNT(*) FROM users');
    const totalEvents = await db.executeWithReturning('SELECT COUNT(*) FROM events')
    const totalMerch = await db.executeWithReturning('SELECT COUNT(*) FROM merch')
    const totalParticipants = await db.executeWithReturning('SELECT COUNT(*) FROM event_offers')
    const totalNews = await db.executeWithReturning('SELECT COUNT(*) FROM mailings')
    const totalDiscounts = await db.executeWithReturning('SELECT COUNT(*) FROM discounts')

    //получение подтвержденных заказов на участие и мерчи
    const cashFromMerch = await db.executeWithReturning('SELECT SUM(toPay) FROM merch_offers WHERE accepted = 1')
    const cashFromEvent = await db.executeWithReturning('SELECT SUM(toPay) FROM event_offers WHERE accepted = 1')
    const totalCash = cashFromMerch[0]['SUM(toPay)'] + cashFromEvent[0]['SUM(toPay)'];

    //вывод данных
    const message = `
        👥 Всего пользователей:  ${totalUsers[0]['COUNT(*)']}/n
        📍 Всего событий: ${totalEvents[0]['COUNT(*)']}/n
        👑 Всего мерчей: ${totalMerch[0]['COUNT(*)']}/n
        🥊 Всего участников:  ${totalParticipants[0]['COUNT(*)']}/n
        📨 Всего рассылок:  ${totalNews[0]['COUNT(*)']}/n
        💯 Всего скидок:  ${totalDiscounts[0]['COUNT(*)']}/n/n
        💸 *Прибыль с мерчей:* ${cashFromMerch[0]['SUM(toPay)'] || 0} ₽/n
        💸 *Прибыль с участников:* ${cashFromEvent[0]['SUM(toPay)'] || 0} ₽/n
        🫰 *Прибыль суммарно:* ${totalCash || 0} ₽/n
    `.format();

    bot.sendMessage(state.chatId, message, state.options);
}

//подтверждение участия
async function confirmJoinEvent(state){

    state.callTimeoutLimit(64800000, 'new offer', 3);

    if(!state.timeoutIsEnd('new offer')){
        state.default();
        return await bot.sendMessage(state.chatId, `ℹ️ *Достигнут лимит на 3 заказа в сутки*`.format(), state.options);
    }

    //подтверждение участия
    const eventOfferId = await db.insert('event_offers', {
        telegram_id: state.chatId,
        event_id: state.data.id,
        full_name: state.data.newParticipant.full_name,
        title: state.data.title,
        toPay: state.data.toPay
    });

    const user = await db.find('users', [[{field: 'telegram_id', exacly: state.chatId}]], true);

    //сброс скидки
    if(user.discount){
        await db.update('users', {discount: 0}, [[{field: 'telegram_id', exacly: state.chatId}]]);
    }

    //вывод сообщения администратору
    await bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ *Новая заявка на участие в мероприятии: "${state.data.title}*"/n/n
    *От:* @${escapeMarkdown(state.data.username)}/n
    *К оплате:* ${state.data.toPay} ₽/n/n
    *Заявка также будет отображена в "Заказах", где ее можно подтвердить или отклонить*
    `.format(), CreateButtons([{
        text: 'Подтвердить ✔️',
        data: `AcceptOffer=event:${eventOfferId}`
    },{
        text: 'Отказать ✖️',
        data: `DeleteOffer=event:${eventOfferId}`
    }], false));

    state.default();
    //рассылка пользователю
    await bot.sendMessage(state.chatId, `*✔️ Заявка отправлена. Ожидайте подтверждения*`, state.options);
}

//управление страницами
async function pagesMenageOptions(state){

    //страница о нас
    await bot.sendMessage(state.chatId, `*Страница* "О нас" 🤝/n/n${config.about_us}`.format(), CreateButtons([{
        text: 'Изменить ✍️',
        data: 'edit about_us'
    }]));

    //страница приветственного сообщения
    await bot.sendMessage(state.chatId, `*Страница* "Приветственное сообщение" 👋/n/n${config.start_message}`.format(), CreateButtons([{
        text: 'Изменить ✍️',
        data: 'edit start_message'
    }]));

    //страница приветственного сообщения
    await bot.sendMessage(state.chatId, `*Страница* "Оплата" 🫰/n/n${config.payment_page}`.format(), CreateButtons([{
        text: 'Изменить ✍️',
        data: 'edit payment_page'
    }]));

    //опции возврата
    state.options = CreateButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }])

    //сообщение возврата
    await bot.sendMessage(state.chatId, `
        ℹ Страница *"О нас"* содержит информацию о проекте, часто дополняется полезными ссылками (обратная связь, сотрудничество и т.д)./n/n
        ℹ Страница *"Приветственное сообщение"* появляется при запуске бота у новых пользователей. Интересное содержание может вызвать желание у потенциальных пользователей сделать заказ./n/n
        ℹ Страница *"Оплата"* содержит информацию о способах оплаты и способах доставки./n/n
    `.format(), state.options);
}

//приветственное сообщение
async function handleStartMessagePage(state, message){

    if(message && ValidateMarkdown(message)){
        const warnMessage = `🔁 *${ValidateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if(state.stepName === 'content'){

        if(!message){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите приветственное сообщение', state.options);
        }
            
        state.data.newStartMessage = {
            content: message
        }

        state._actionHandleFunction = handleStartMessagePage;

        //управление
        const buttons = CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        },{
            text: 'Подтвердить ✔️',
            data: 'confirm start_message'
        }])
        
        state.recordStep('confirm start_message', `🤝 *Предосмотр приветственного сообщения*/n/n
            ${state.data.newStartMessage.content}
        `.format(), buttons);
        
        return state.executeLastStep();
    }
}

//приветственное сообщение
async function handlePaymentPage(state, message){

    if(message && ValidateMarkdown(message)){
        const warnMessage = `🔁 *${ValidateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if(state.stepName === 'content'){

        if(!message){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите содержание для страницы оплаты', state.options);
        }
            
        state.data.newPaymentPage = {
            content: message
        }

        state._actionHandleFunction = handleStartMessagePage;

        //управление
        const buttons = CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        },{
            text: 'Подтвердить ✔️',
            data: 'confirm payment_page'
        }])
        
        state.recordStep('confirm payment_page', `🫰 *Предосмотр страницы оплаты*/n/n
            ${state.data.newPaymentPage.content}
        `.format(), buttons);
        
        return state.executeLastStep();
    }
}

//участие в мероприятии
async function handleJoinEvent(state, message){

    if(message && message.match(/[\*\(\)\[\]\`_]/g)){
        const warnMessage = `🔁 *Ввод содержит запрещенные символы*/n/n
        Повторите ввод используя кириллицу, или латинские буквы`.format();
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if(state.stepName === 'fullname'){

        if(!message){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите вашу фамилию, имя и отчество', state.options);
        }

        state.data.newParticipant = {
            full_name: message
        }

        state._actionHandleFunction = handleJoinEvent;

        //управление
        const buttons = CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        },{
            text: 'Отправить заявку ✔️',
            data: 'confirm join_event'
        }]);

        //получение события, для участия
        const event = await db.find('events', [[{
            field: 'id',
            exacly: state.data.id
        }]], true)

        //расчет оплаты
        const paymentDetails = await calcOfferPayment(event, state, 'Участие');
        state.data.toPay = paymentDetails.toPay;
        state.data.title = event.title;

        //следующий
        state.recordStep('confirm', `*${state.data.newParticipant.full_name}*/n/n
        🔥 *Событие:* ${event.title}/n
        ✊ *К оплате:* ${paymentDetails.toPay} ₽/n
        💯 *Скидка:* ${paymentDetails.discountSum} %/n/n
        🎁 *Приглашайте друзей по реферальной ссылке в "Мои бонусы". 
        За каждого друга — ${config.invite_discount}%, другу — ${config.for_invited_discount}%*/n/n
        ${config.payment_page}
        `.format(), buttons);

        return state.executeLastStep();
    }
}

async function userMerchHandler(state){

    //получение всех мерчей и объединиение с заказами
    const allMerch = await db.find('merch');

    if(!allMerch.length){
        return await bot.sendMessage(state.chatId, '*Мерчи будут уже скоро* ✊', state.options);
    }

    for(let item of allMerch){

        const {toPay, discountSum} = await calcOfferPayment(item, state, 'Мерчи');
        
        const message = `*${item.title}*/n
        *Цена:* ${toPay} ₽ ${discountSum ? `скидка — ${discountSum} %` : ''}/n/n${item.content}
        `.format();

        const buttons = CreateButtons([{
            text: 'Заказать 🐾',
            data: `OfferMerch=${item.id}`
        }]);

        await bot.sendMessage(state.chatId, message, buttons);
    }

    await bot.sendMessage(state.chatId, '*Выберите свой орининальный принт* 💪', CreateButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

//расчет стоимости участия
async function calcOfferPayment(event, state, category){

    //получение всех скидок
    const allDiscounts = await db.find('discounts', [[{
        field: 'category',
        exacly: 'Все'
    }],[{
        field: 'category',
        exacly: category
    }]]);

    let discountSum = 0;

    //повышение скидки
    for(let discount of allDiscounts){
        if(discount.category === 'Все' || discount.category === category){
            discountSum += discount.discount;
        }
    }   

    //получение этого пользователя
    const thisUser = await db.find('users', [[{
        field: 'telegram_id',
        exacly: state.chatId
    }]], true);

    discountSum += thisUser.discount;

    //проверка, что скидка не больше 100%
    if(discountSum > 100) discountSum = 100;

    return {toPay: event.price - (event.price * discountSum / 100), discountSum}
}

//О нас
async function handleAboutUsPage(state, message){

    if(message && ValidateMarkdown(message)){
        const warnMessage = `🔁 *${ValidateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if(state.stepName === 'content'){

        if(!message){
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите содержание для вкладки "О нас"', state.options);
        }
            
        state.data.newAboutUs = {
            content: message
        }

        state._actionHandleFunction = handleAboutUsPage;

        //управление
        const buttons = CreateButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        },{
            text: 'На шаг назад 🔙',
            data: 'step back'
        },{
            text: 'Подтвердить ✔️',
            data: 'confirm about_us'
        }])
        
        state.recordStep('confirm about_us', `👋 *Предосмотр вкладки "О нас"*/n/n
            ${state.data.newAboutUs.content}
        `.format(), buttons);
        
        return state.executeLastStep();
    }
}

//управление скидками
async function giftMenageOptions(state){

    const invtDisBtns = CreateButtons([{
        text: 'Изменить',
        data: 'edit inv_discount'
    }]);

    await bot.sendMessage(state.chatId, `💯 *За приглашение ${config.invite_discount}%, 
    приглашенному: ${config.for_invited_discount}%*`.format(), invtDisBtns);

    //получение данных
    const discounts = await db.find('discounts');

    if(!discounts.length){
        await bot.sendMessage(state.chatId, '*Другие скидки отсутствуют* ✊', {parse_mode: 'Markdown'});
    }

    for(let discount of discounts){
        //опции
        const buttons = CreateButtons([{
            text: 'Пересоздать 🔁',
            data: `EditDiscount=${discount.id}`
        },{
            text: 'Удалить ✖️',
            data: `DeleteDiscount=${discount.id}`
        }]);

        await bot.sendMessage(state.chatId, `
            *№${discount.id} — ${discount.title}*/n/n
            💯 *Скидка:* ${discount.discount}%/n
            ❓ *Категория:* ${discount.category}
        `.format(), buttons);
    }

    //опции
    state.options = CreateButtons([{
        text: 'Создать скидку ➕',
        data: 'add discount'
    },{
        text: 'На главную 🔙',
        data: 'main menu'
    }])

    await bot.sendMessage(state.chatId, '*Вы также можете добавить новую скидку 👇*', state.options);
}

//измение скидки за приглашение
async function handleEditDiscount(state, message){

    const valuesCheck = message.match(/^Приглашение=\d+\sПриглашенному=\d+$/g);

    if(!valuesCheck){
        return await bot.sendMessage(state.chatId, `ℹ️ Некорректное значение. Пример ввода:/n/n"Приглашение=50 Приглашенному=25"`.format(), state.options);
    }

    //обновление config
    const invitedValue = message.split(' ')[0].replace('Приглашение=', '');
    const forInvitedValue = message.split(' ')[1].replace('Приглашенному=', '');

    if(invitedValue > 100 || invitedValue < 0){
        return await bot.sendMessage(state.chatId, `ℹ️ Некорректное значение. скидка "Приглашенному" должна быть в диапозоне от 0 до 100.`.format(), state.options);
    }

    if(forInvitedValue > 100 || forInvitedValue < 0){
        return await bot.sendMessage(state.chatId, `ℹ️ Некорректное значение. Скидка за "Приглашение" должно быть в диапозоне от 0 до 100.`.format(), state.options);
    }

    //обновление config
    config.invite_discount = Number(invitedValue);
    config.for_invited_discount = Number(forInvitedValue);

    //сохранение config
    await fs.writeFile('./config.json', JSON.stringify(config, null, 2));
    state.default();

    await bot.sendMessage(state.chatId, `*Скидки обновлены ✔️*`, CreateButtons([{text: 'На главную 🔙', data: 'main menu'}]));
}

async function participantsMenageOptions(state){
    const events = await db.find('events');

    //отсутсвие мероприятий
    if(!events.length) {
        return await bot.sendMessage(state.chatId, '*В ближайшее время событий не запланировано* ✊', state.options);
    }

    //показ короткой информации о мероприятии и кнопки управления (участники)
    for(let event of events) {
        const message = `
            №${event.id} *${event.title}*/n/n
            📅 *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
            🔻 *Место проведения:* ${event.place}/n
            🥊 *Весовая категория:* от ${event.weight_from} до ${event.weight_to} кг/n
            🫰 *Цена*: ${event.price} ₽
        `.format();

        //участники по мероприятию
        const buttons = CreateButtons([{
            text: 'Участники',
            data: `participants=${event.id}`
        }])

        await bot.sendMessage(state.chatId, message, buttons);
    }   

    state.options = CreateButtons([{
        text: 'На главную',
        data: 'main menu'
    }]);

    return bot.sendMessage(state.chatId, '*Выберите участников того или иного мероприятия*', state.options);
}

//просмотр событий и участие
async function eventsList(state){
    //все события
    const allEvents = await db.find('events', [[{
        field: 'event_date',
        more: new Time().shortUnix()
    }]]);

    if(!allEvents.length){
        return await bot.sendMessage(state.chatId, '*В ближайшее время событий не запланировано* ✊', state.options);
    }

    //вывод событий
    for(let event of allEvents) {

        //получение заказа на такое мероприятие
        const existOffer = await db.find('event_offers', [[{
            field: 'telegram_id',
            exacly: state.chatId
        }, {
            field: 'event_id',
            exacly: event.id
        }]], true)

        //кнопки участия
        const joinButtons = existOffer ? CreateButtons([{
            text: 'Заявка подана ✔️',
            data: 'member'
        }]) : CreateButtons([{
            text: 'Принять участие 🥊',
            data: 'JoinEvent=' + event.id
        }])

        const {toPay, discountSum} = await calcOfferPayment(event, state, 'Участие');

        await bot.sendMessage(state.chatId, `*${event.title}*/n/n
        📅 *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
        🔻 *Место проведения:* ${event.place}/n
        🥊 *Весовая категория:* от ${event.weight_from} до ${event.weight_to} кг/n
        ✊ *Участие*: ${toPay} ₽ ${discountSum ? ` — скидка ${discountSum} %` : ''}/n/n
        ${event.content}`.format(), joinButtons);
    }

    return await bot.sendMessage(state.chatId, 'ℹ Чтобы принять участие, выберите событие и заполните моментальную заявку', CreateButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

//подтверждение заказа
async function confirmOfferMerch(state){
    
    state.callTimeoutLimit(64800000, 'new offer', 3);

    if(!state.timeoutIsEnd('new offer')){
        state.default();
        return await bot.sendMessage(state.chatId, `ℹ️ *Достигнут лимит на 3 заказа в сутки*`.format(), state.options);
    }

    //подтверждение участия
    const merchOfferId = await db.insert('merch_offers', {
        telegram_id: state.chatId,
        merch_id: state.data.id,
        title: state.data.title,
        toPay: state.data.toPay
    });

    const user = await db.find('users', [[{field: 'telegram_id', exacly: state.chatId}]], true);

    //сброс скидки
    if(user.discount){
        await db.update('users', {discount: 0}, [[{field: 'telegram_id', exacly: state.chatId}]]);
    }

    //вывод сообщения администратору
    await bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ *Новая заявка на покупку мерча: "${state.data.title}*"/n/n
    *От:* @${escapeMarkdown(state.data.username)}/n
    *К оплате:* ${state.data.toPay} ₽/n/n
    *Заявка также будет отображена в "Заказах", где ее можно подтвердить или отклонить*
    `.format(), CreateButtons([{
        text: 'Подтвердить ✔️',
        data: `AcceptOffer=merch:${merchOfferId}`
    },{
        text: 'Отказать ✖️',
        data: `DeleteOffer=merch:${merchOfferId}`
    }], false));

    state.default();
    //рассылка пользователю
    await bot.sendMessage(state.chatId, `*Заказ отправлен. Ожидайте подтверждения* ✔️`, state.options);
}

//мои мерч
async function myMerchOffer(state){
    
    //получение всех мерчей и объединиение с заказами
    const myMerch = (await db.find('merch_offers', [[{
        field: 'telegram_id', exacly: state.chatId
    }]]));

    if(!myMerch.length){
        return await bot.sendMessage(state.chatId, '*У вас пока отсутствуют заказы* ✊\n\nЗакажи свой уникальный мерч в *"Заказать мерч"* 👇', state.options);
    }

    for(let item of myMerch){

        //одобренный заказ
        if(item.accepted){

            //подтверждение заказа
            const base64UrlCommand = btoa(`ConfirmMerch=${item.recive_key}`);
            const checkofferUrl = `https://t.me/${BOT_USERNAME}?start=${base64UrlCommand}`

            //qr-код получения заказа
            const qrCodeBuffer = await QRCode.toBuffer(checkofferUrl, {type: 'png'});

            const message = `*Предъявите данный QR код для получения заказа*/n/n
            *${item.title}*/n*Статус заказа:* Подтвержден ✔️/n
            *Заказан:* ${new Time(item.created_at).toFriendlyString()}`.format();

            //сообщение
            await bot.sendPhoto(state.chatId, qrCodeBuffer, {
                caption: message,
                parse_mode: 'Markdown'
            });
        }
        //ожидающий
        else {

            const message = `*${item.title}*/n
                *Цена:* ${item.toPay} ₽/n
                *Заказан:* ${new Time(item.created_at).toFriendlyString()}/n/n
                *Статус заказа:* Ожидает подверждения ℹ
            `.format();

            await bot.sendMessage(state.chatId, message, {parse_mode: 'Markdown'});
        }
    }

    await bot.sendMessage(state.chatId, '*После подтверждения заказа вам доступен QR код для получения мерча* 💪', CreateButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

//заказ мерча
async function offerMerch(state, merchId){

    //получение мерча
    const merch = await db.find('merch', [[{
        field: 'id',
        exacly: merchId
    }]], true);

    //расчет оплаты
    const {toPay, discountSum} = await calcOfferPayment(merch, state, 'Мерчи');

    //заполнение состояния
    state.data.id = merchId;
    state.data.title = merch.title;
    state.data.toPay = toPay;

    //сообщение
    const message = `
        *${merch.title}*/n
        ✊ *К оплате:* ${toPay} ₽/n
        💯 *Скидка:* ${discountSum} %/n/n
        🎁 *Приглашайте друзей по реферальной ссылке в "Мои бонусы". 
        За каждого друга — ${config.invite_discount}%, другу — ${config.for_invited_discount}%*/n/n
        ${config.payment_page}
    `.format();

    //кнопки управления
    state.options = CreateButtons([{
        text: 'На главную 🔙',
        data: `main menu`
    },{
        text: 'Заказать ✔️',
        data: 'confirm'
    }]);

    await bot.sendMessage(state.chatId, message, state.options);
}

//обработка участников по мероприятиям
async function participantsList(state, eventId){

    //получение данных
    const participants = await db.find('event_offers', [[{
        field: 'accepted', exacly: 1
    }, {
        field: 'event_id', exacly: eventId
    }]]);

    //если участников пока нет
    if(!participants.length){
        return bot.sendMessage(state.chatId, '*Участников пока нет* ✊', {parse_mode: 'Markdown'});
    }

    //вывод участников
    for(let participant of participants){

        //получение пользователя
        const currentUser = await db.find('users', [[{
            field: 'telegram_id',
            exacly: participant.telegram_id
        }]], true);

        //информация об участнике
        const message = `
            *ФИО:* ${participant.full_name}/n
            *Дата заказа:* ${new Time(participant.created_at).toFriendlyString()}/n/n
            *Телеграм участника:* @${escapeMarkdown(currentUser.username)}/n
        `.format();

        await bot.sendMessage(state.chatId, message, {parse_mode: 'Markdown'});
    }

    await bot.sendMessage(state.chatId, '*Тут отображен список участников, учестие которых вы подвердили в заявках для данного мероприятия*', CreateButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

//подтвреждение заказа
async function confirmOffer(state, offerType, offerId){
    const table = offerType === 'event' ? 'event_offers' : 'merch_offers';

    //проверка существование заказа
    const offer = await db.find(table, [[{
        field: 'id',
        exacly: offerId
    }]], true);

    if(!offer) return bot.sendMessage(state.chatId, '*Заказ не найден* ✊', {parse_mode: 'Markdown'});

    if(offer.accepted) return bot.sendMessage(state.chatId, '*Заказ уже подтвержден* ✊', {parse_mode: 'Markdown'});

    const offerClause = offerType === 'event' ? 'участие в мероприятии' : 'приобретение мерча';

    //генериция кода, для получения заказа
    const recive_key = RandCode(12);

    const thisOffer = await db.find(table, [[{field: 'id', exacly: offerId}]], true);

    //проверка пользователя на наличие платного заказа
    const user = await db.find('users', [[{field: 'telegram_id', exacly: thisOffer.telegram_id}]], true);

    //установка первого первого заказа
    if(!user.made_first_offer){
        await db.update('users', {made_first_offer: 1}, [[{field: 'telegram_id', exacly: thisOffer.telegram_id}]]);
        if(user.invited_by) {
            const invitedByUser = await db.find('users', [[{field: 'telegram_id', exacly: user.invited_by}]], true);
            const newDiscount = invitedByUser.discount += config.invite_discount;
            const normalDiscount = newDiscount > 100 ? 100 : newDiscount;
            await db.update('users', {discount: normalDiscount}, [[{field: 'telegram_id', exacly: user.invited_by}]]);
            await bot.sendMessage(user.invited_by, `*Пользователь @${user.username} сделал платный заказ*/n/n
            🎁 Вы получаете дополнительный бонус ${config.invite_discount} % на все`.format(), {parse_mode: 'Markdown'});
        }
    }

    await db.update(table, {accepted: 1, recive_key}, [[{
        field: 'id',
        exacly: offerId
    }]]);

    await bot.sendMessage(state.chatId, `*Заказ на ${offerClause} "${offer.title}" подтвержден ✔️*`, {parse_mode: 'Markdown'});

    //рассылка пользователю
    await bot.sendMessage(user.telegram_id, `*Заказ на ${offerClause} "${offer.title}" подтвержден ✔️*/n/n
        Детали по заказу смотрите во вкладке ${offerType === 'event' ? '"Участникам"' : '"Мои мерчи"'}
        `.format(), {parse_mode: 'Markdown'});
}

//Удаление заказа
async function deleteOffer(state, offerType, offerId){

    const table = offerType === 'event' ? 'event_offers' : 'merch_offers';
    const offerClause = offerType === 'event' ? 'участие в мероприятии' : 'приобретение мерча';

    //проверка существование заказа
    const offer = await db.find(table, [[{
        field: 'id',
        exacly: offerId
    }]], true);

    if(!offer) return bot.sendMessage(state.chatId, '*Заказ не найден* ✊', {parse_mode: 'Markdown'});

    await db.delete(table, [[{
        field: 'id',
        exacly: offerId
    }]]);

    await bot.sendMessage(state.chatId, `*Заказ на ${offerClause} №${offerId} отменен ✔️*`, {parse_mode: 'Markdown'});
}

//удаление рассылки
async function deleteMail(state, mailingId){

    //проверка существование рассылки
    const existMailing = await db.find('mailings', [[{field: 'id', exacly: mailingId}]], true)

    if(!existMailing) {
        return await bot.sendMessage(state.chatId, '*Рассылка не найдена* ✊', {parse_mode: 'Markdown'});
    }

    //удаление из базы данных
    await db.delete('mailings', [[{
        field: 'id',
        exacly: mailingId
    }]]);

    //обновление таймаутов рассылки
    updateMailingTimer(mailingId);

    //отправка сообщения
    bot.sendMessage(state.chatId, `*Рассылка №${mailingId} удалена* ✔️`, state.options);
}

//управленеи рассылками
async function mailingsMenageOptions(state){
    const allMailings = await db.find('mailings');

    //проверка наличия рассылок
    if(!allMailings.length) await bot.sendMessage(state.chatId, '*Рассылки отсутствуют* ✊', {parse_mode: 'Markdown'});

    //присыланеи всех рассылок
    for(let mailing of allMailings){

        //кнопки управления
        const buttons = CreateButtons([{
            text: 'Пересоздать 🔁',
            data: `EditMail=${mailing.id}`
        }, {
            text: 'Удалить ✖️',
            data: `DeleteMail=${mailing.id}`
        }])

        //сообщение
        const message = `
            *№${mailing.id} — ${mailing.title}*/n/n
            📨 *Тип рассылки:* ${mailing.send_type}/n
            ${mailing.repeats ? `🔁 *Повторять каждые:* ${TextDayFormat(mailing.repeats/86400)}` : `📅 *Отправка:* ${new Time(mailing.response_time).toFriendlyString()}`}/n
            👥 *Аудитория:* ${mailing.audience}/n/n
            ${mailing.content}
        `.format();

        //отправка
        await bot.sendMessage(state.chatId, message, buttons);
    }

    //опции управления
    state.options = CreateButtons([{
        text: 'Создать новую рассылку ➕',
        data: 'add mail'
    },{
        text: 'Вернуться на главную 🔙',
        data: 'main menu'
    }]);

    //показать кнопки снова
    bot.sendMessage(state.chatId, '*Вы также можете добавить новую рассылку 👇*', state.options);
}

//инициализация таймеров и таймаутов рассылок
async function mailingSender(mail, callbackMessage, deleteAfter = false){

    //отправка сообщения
    await sendMail(mail);

    //удаление сообщения
    if(deleteAfter){
        await db.delete('mailings', [[{field: 'id', exacly: mail.id}]])
    }

    if(callbackMessage){
        //уведомление администратора
        await bot.sendMessage(...Object.values(callbackMessage));
    }
}

let mailingsTimers = [];

//для очистки таймаутов и таймеров
function clearTimer(timerId) {
    // Очищаем и таймауты, и интервалы
    clearTimeout(timerId);  // работает и с таймаутами, и с интервалами
}

//обновленеи таймаутов и таймеров
async function updateMailingTimer(mailingId){

    //таймут на замену
    changedMailingTimer = mailingsTimers.find(item => item.id == mailingId);
    
    if(changedMailingTimer){
        clearTimer(changedMailingTimer.timerId);
        mailingsTimers = mailingsTimers.filter(item => item.id != mailingId);
    }

    //поиск рассылки
    const mailing = await db.find('mailings', [[{field: 'id', exacly: mailingId}]], true);

    //обновление таймаута
    if(mailing) setMailingTimer(mailing);
}

async function initMailingsTimers(){
    const allMails = await db.find('mailings');

    //инициализация рассылок    
    for(let mail of allMails){
        setMailingTimer(mail);
    }
}

//установка таймаута
function setMailingTimer(mail){

    const timeNow = new Time().shortUnix();

    //уведомление администратора
    const message = {
        chatId: ADMIN_TELEGRAM_ID, text: '',
        options: {parse_mode: 'Markdown'}
    }

    //проверка типа письма и сроков
    if(mail.send_type === "Запланированная" && timeNow <= mail.response_time){
        //уведомление администратора
        message.text = `*Запланированная рассылка №${mail.id} выполнена и очищена* ✔️`;

        //инициализация таймеров и таймаутов рассылок
        const timerId = setTimeout(() => mailingSender(mail, message, true), (mail.response_time - timeNow) * 1000);

        mailingsTimers.push({id: mail.id, timerId});
    }

    //проверка типа письма и сроков
    if(mail.send_type === "Периодическая"){
        //уведомление администратора
        message.text = `*Переодическая рассылка №${mail.id} выполнена ✔️*/n/n
        Следующая отправка через: ${TextDayFormat(mail.repeats/86400)}`.format();

        //инициализация таймеров и таймаутов рассылок
        const timerId = setInterval(() => mailingSender(mail, message), mail.repeats * 1000);

        mailingsTimers.push({id: mail.id, timerId});
    }
}

//запуск сервера
app.listen(3030, '0.0.0.0', async () => {
    console.clear();
    await initConnection();
    await initMailingsTimers();
   WriteInLogFile(`Сервер запущен на порту ${PORT || 3030} ✨`);
})