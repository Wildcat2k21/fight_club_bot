const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');
const Time = require('@utils/time');

//обработка участников по мероприятиям
async function eventOffersList(state, eventId) {

    //получение данных
    const eventOffers = await db.find('event_offers', [[{
        field: 'accepted', exacly: 1
    }, {
        field: 'event_id', exacly: eventId
    }]]);

    //если участников пока нет
    if (!eventOffers.length) {
        return bot.sendMessage(state.chatId, '*Участников пока нет* ✊', { parse_mode: 'Markdown' });
    }

    //вывод участников
    for (let participant of eventOffers) {

        //получение пользователя
        const currentUser = await db.find('users', [[{
            field: 'telegram_id',
            exacly: participant.telegram_id
        }]], true);

        //информация об участнике
        const message = `
            *ФИО:* ${participant.fullname}/n
            *Дата заказа:* ${new Time(participant.created_at).toFriendlyString()}/n/n
            *Телеграм участника:* @${escapeMarkdown(currentUser.username)}/n
        `.format();

        await bot.sendMessage(state.chatId, message, { parse_mode: 'Markdown' });
    }

    await bot.sendMessage(state.chatId, '*Тут отображен список участников, учестие которых вы подвердили в заявках для данного мероприятия*', createButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

module.exports = eventOffersList;