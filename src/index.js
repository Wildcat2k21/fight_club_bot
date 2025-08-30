// dev
require('dotenv').config();
require('module-alias/register');

//основные модули
const express = require('express');

// Пользовательские модули
const { initServices } = require('./services');
const writeInLogFile = require('@utils/logging.js');
const createButtons = require('@utils/create-buttons.js');
const decodeCommand = require('@other/decode-command.js');

//основная конфигурация
const PORT = process.env.PORT || 3030;
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);

// Инициализация
const app = express();

initServices().then(async () => {
    writeInLogFile("debug log");
    const { getServices } = require('@services');
    const { bot, states, db } = getServices();

    // Модули, задействующие сервисы
    const {
        initMailingsTimers
    } = require('./helpers/mailing/mailings');

    const handleCommand = require('./helpers/other/handle-command');
    const authUser = require('./helpers/other/auth-user');


    const handleMerchMenagment = require('./helpers/merch/handle-merch-menagment');

    const handleMailMenagment = require('./helpers/mailing/handle-mail-menagment');

    const handleDiscountMenagment = require('./helpers/discount/handle-discount-menagment');

    const handleStartMessagePage = require('./helpers/pages/handle-start-message-page');
    const handlePaymentPage = require('./helpers/pages/handle-payment-page');
    const handleAboutUsPage = require('./helpers/pages/handle-about-us-page');

    const handleJoinEvent = require('./helpers/event/handle-join-event');
    const handleEditDiscount = require('./helpers/discount/handle-edit-discount');
    
    const eventsMenageOptions = require('./helpers/event/events-menage-options');
    const eventOffersList = require('./helpers/event/event-offers-list');
    const handleEventMenagement = require('./helpers/event/handle-event-menagement');
    const confirmNewEvent = require('./helpers/event/confirm-new-event');
    const notifyEvent = require('./helpers/event/notify-event');
    const deleteEvent = require('./helpers/event/delete-event');
    const eventsList = require('./helpers/event/events-list');
    const selectEventToJoin = require('./helpers/event/select-event-to-join');
    const confirmJoinEvent = require('./helpers/event/confirm-join-event');
    const handleStatistics = require('./helpers/other/handle-statistics');

    const rafflesMenageOptions = require('./helpers/raffle/raffles-menage-options');
    const raffleOffersList = require('./helpers/raffle/raffle-offers-list');
    const handleRaffleMenagement = require('./helpers/raffle/handle-raffle-menagement');
    const confirmNewRaffle = require('./helpers/raffle/confirm-new-raffle');
    const notifyRaffle = require('./helpers/raffle/notify-raffle');
    const deleteRaffle = require('./helpers/raffle/delete-raffle');
    const raffleList = require('./helpers/raffle/raffle-list');
    const selectRaffleToJoin = require('./helpers/raffle/select-raffle-to-join');
    const confirmJoinRaffle = require('./helpers/raffle/confirm-join-raffle');

    const myParticipationsHandler = require('./helpers/other/my-participations-handler');

    const offersMenageOptions = require('./helpers/offer/offers-menage-options');
    const merchMenageOptions = require('./helpers/merch/merch-menage-options');
    const deleteMerch = require('./helpers/merch/delete-merch');
    const confirmNewMerch = require('./helpers/merch/confirm-new-merch');
    const notifyMerch = require('./helpers/merch/notify-merch');

    const mailingsMenageOptions = require('./helpers/mailing/mailings-menage-options');
    const confirmNewMail = require('./helpers/mailing/confirm-new-mail');
    const deleteMail = require('./helpers/mailing/delete-mail');

    const giftMenageOptions = require('./helpers/discount/gift-menage-options');
    const confirmNewDiscount = require('./helpers/discount/confirm-new-discount');
    const deleteDiscount = require('./helpers/discount/delete-discount');

    const confirmOffer = require('./helpers/offer/confirm-offer');
    const deleteOffer = require('./helpers/offer/delete-offer');

    const pagesMenageOptions = require('./consts/pages-menage-options');
    const confirmStartMessage = require('./helpers/pages/confirm-start-message');
    const confirmAboutUs = require('./helpers/pages/confirm-about-us');

    const confirmPaymentPage = require('./helpers/pages/confirm-payment-page');
    const myMerchOffer = require('./helpers/merch/my-merch-offer');
    const userMerchHandler = require('./helpers/merch/user-merch-handler');
    const offerMerch = require('./helpers/merch/offer-merch');
    const confirmOfferMerch = require('./helpers/merch/confirm-offer-merch');
    const menageUserGifts = require('./helpers/discount/menage-user-gifts');

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

            //ввод нового розыгрыша
            if (state.action === 'add raffle') {
                return handleRaffleMenagement(state, msg.text);
            }

            //ввод нового розыгрыша
            if (state.action === 'join raffle') {
                return selectRaffleToJoin(state, msg.text);
            }
            
            //ввод нового собыьтия
            if (state.action === 'add event') {
                return handleEventMenagement(state, msg.text);
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

            //рассылка нового события
            if (msg.data === 'notify' && state.action === 'add event') {
                return await notifyEvent(state);
            }

            // ---------------------------- Обработка розыгрышей администратора -----------------------------

            //добавление нового розыгрыша
            if (msg.data === 'add raffle' && state.action === 'default') {
                //сценарий нового события
                state.action = 'add raffle';

                //кнопки отмены            
                const buttons = createButtons([{
                    text: 'Отменить ✖️',
                    data: 'main menu'
                }])

                state.recordStep('name', 'ℹ Введите название розыгрыша', buttons);
                return state.executeLastStep();
            }

            //подтверждение события
            if (msg.data === 'confirm new raffle' && state.action === 'add raffle') {
                return await confirmNewRaffle(state);
            }

            //рассылка нового розыгрыша
            if (msg.data === 'notify raffle' && state.action === 'add raffle') {
                return await notifyRaffle(state);
            }

            //удаление выбраного события
            if (msg.data.indexOf('DeleteRaffle') !== -1 && state.action === 'default') {
                const raffleId = msg.data.split('=')[1];
                return await deleteRaffle(state, raffleId);
            }

            // ---------------------------- Навигация по истории -----------------------------

            //шаг назад в сценарии
            if (msg.data === 'step back' && state.action !== 'default' && state._steps.length > 1) {
                state.stepBack();
                state._actionHandleFunction(state);
                return;
            }

            // ---------------------------- Обработка розыгрышей администратора -----------------------------

            //вкладка "события"
            if (msg.data === 'menage raffles' && state.action === 'default') {
                return await rafflesMenageOptions(state);
            }

            //показ участников мероприятия
            if (msg.data.indexOf('RaffleOffers') !== -1 && state.action === 'default') {
                const raffleId = msg.data.split('=')[1];
                return await raffleOffersList(state, raffleId);
            }

            //Очистка списка призов
            if (msg.data === 'clean prizes' && state.action === 'add raffle' && state.data.newRaffleData.prizes.length) {
                state.data.newRaffleData.prizes = [];
                await bot.sendMessage(chatId, "Призы очищены ✔️");

                return state.executeLastStep();
            }

            //Выбор победителей
            if (msg.data.indexOf('RaffleWinner') !== -1 && state.action === 'default') {
                const raffleId = msg.data.split('=')[1];
                
                //кнопки отмены            
                const buttons = createButtons([{
                    text: 'Отменить ✖️',
                    data: 'main menu'
                }])

                const prizes = await db.find('winners');
                state.action = "select raffle winner"
                state.recordStep("winner number", `
                    ℹ️ *Осталось призовых мест: ${prizes.length}. Введите номер билета победителя и номер места, к примеру:*/n/n
                    13:1 *(Что означает 13 билет занят 1 место)/n/n
                    📨 После выбора победителя, будет выполнена автоматическая рассылка всем участникам о выбранном победители*`
                    .format(),buttons);

                return state.executeLastStep();
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

            //показ участников мероприятия
            if (msg.data.indexOf('EventOffers') !== -1 && state.action === 'default') {
                const eventId = msg.data.split('=')[1];
                return await eventOffersList(state, eventId);
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
                await raffleList(state);
                await eventsList(state);

                // сообщение с возвратом в меню
                return await bot.sendMessage(
                    state.chatId,
                    'ℹ Чтобы принять участие, выберите событие и подайте заявку 👇',
                    createButtons([{ text: 'На главную 🔙', data: 'main menu' }])
                );
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

            // ------------------------------------ Розыгрыш заявка ------------------------------------------

            //участие в событии
            if (msg.data.indexOf('JoinRaffle') !== -1 && state.action === 'default') {
                const raffleId = msg.data.split('=')[1];

                //проверка на участие или подание заявки
                const existOffer = await db.find('raffle_offers', [[{
                    field: 'user_telegram_id',
                    exacly: state.chatId
                }, {
                    field: 'raffle_id',
                    exacly: raffleId
                }]], true);

                if (existOffer) {
                    state.default();
                    return await bot.sendMessage(state.chatId, '*ℹ️ Вы уже участвуете в этом событии*', state.options);
                }

                state.action = 'join raffle';
                state.recordStep('fullname', "ℹ️ Введите своё Фамилию, имя, отчество (при наличии)", createButtons([{
                    text: 'Отменить ✖️',
                    data: 'main menu'
                }]));

                state.data.raffleId = raffleId;
                return state.executeLastStep();
            }

            //подтверждение участия в розыгрыше
            if (msg.data === 'confirm join_raffle' && state.action === 'join raffle') {
                return await confirmJoinRaffle(state);
            }

            // ------------------------------------ участикам ------------------------------------------

            //вкладка "Участникам"
            if (msg.data === 'member' && state.action === 'default') {
                return await myParticipationsHandler(state);
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
    app.listen(PORT, '0.0.0.0', async () => {
        console.clear();
        // await initConnection();
        await initMailingsTimers();
        writeInLogFile(`Сервер запущен на порту ${PORT} ✨`);
    });
});

//форматирование строк
String.prototype.format = function () {
    return this.replace(/ {2,}/g, ' ').replace(/((?=\n)\s+)|\n/g, '').replace(/\/n/g, '\n');
}
