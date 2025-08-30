const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');

const tableNames = {
    event: 'event_offers',
    merch: 'merch_offers',
    raffle: 'raffle_offers'
}

const actionNames = {
    event: 'участие в мероприятии',
    merch: 'приобретение мерча',
    raffle: 'участие в розыгрыше'
}

const ADMIN_TELEGRAM_USERNAME = process.env.ADMIN_TELEGRAM_USERNAME;

//Удаление заказа
async function deleteOffer(state, offerType, offerId) {

    if(!tableNames[offerType]) {
        throw new Error(`Таблица ${offerType} не определена в списке таблиц`);
    }

    const table = tableNames[offerType];
    const offerClause = actionNames[offerType];

    //проверка существование заказа
    const offer = await db.find(table, [[{
        field: 'id',
        exacly: offerId
    }]], true);

    if (!offer) return bot.sendMessage(state.chatId, '*Заказ не найден* ✊', { parse_mode: 'Markdown' });

    await db.delete(table, [[{
        field: 'id',
        exacly: offerId
    }]]);

    if(!offer.accepted) {
        await bot.sendMessage(offer.user_telegram_id, `*Ваш заказ на ${offerClause} "${offer.title}" был отменен. Попробуйте переоформить 🔁*/n/n
            Если считаете это ошибкой, напишите нам @${escapeMarkdown(ADMIN_TELEGRAM_USERNAME)} 👈`.format(), createButtons([{
            text: 'На главную 🔙',
            data: 'main menu'
        }]));
    }

    await bot.sendMessage(state.chatId, `*Заказ на ${offerClause} №${offerId} отменен ✔️*`, { parse_mode: 'Markdown' });
}

module.exports = deleteOffer;