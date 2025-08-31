const { getServices } = require('@services');
const { bot, db } = getServices();
const { randCode } = require('@utils/other');
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');

const tableNames = {
    event: 'event_offers',
    merch: 'merch_offers',
    raffle: 'raffle_tickets'
}

const actionNames = {
    event: 'участие в мероприятии',
    merch: 'приобретение товара',
    raffle: 'участие в розыгрыше'
}

const tabNames = {
    event: 'Участникам',
    merch: 'Мои товары',
    raffle: 'Участникам'
}

//подтвреждение заказа
async function confirmOffer(state, offerType, offerId) {

    if(!tableNames[offerType]) {
        throw new Error(`Таблица ${offerType} не определена в списке таблиц`);
    }

    const table = tableNames[offerType];

    //проверка существование заказа
    const offer = await db.find(table, [[{
        field: 'id',
        exacly: offerId
    }]], true);

    if (!offer) return bot.sendMessage(state.chatId, '*Заказ не найден* ✊', { parse_mode: 'Markdown' });

    if (offer.accepted) return bot.sendMessage(state.chatId, '*Заказ уже подтвержден* ✊', { parse_mode: 'Markdown' });

    const offerClause = actionNames[offerType];

    //генериция кода, для получения заказа
    const recive_key = randCode(12);

    const thisOffer = await db.find(table, [[{ field: 'id', exacly: offerId }]], true);

    //проверка пользователя на наличие платного заказа
    const user = await db.find('users', [[{ field: 'telegram_id', exacly: thisOffer.user_telegram_id }]], true);

    //установка первого заказа
    if (!user.made_first_offer) {
        await db.update('users', { made_first_offer: 1 }, [[{ field: 'telegram_id', exacly: thisOffer.user_telegram_id }]]);
        if (user.invited_by) {
            const invitedByUser = await db.find('users', [[{ field: 'telegram_id', exacly: user.invited_by }]], true);
            const newDiscount = invitedByUser.discount += config.invite_discount;
            const normalDiscount = newDiscount > 100 ? 100 : newDiscount;
            await db.update('users', { discount: normalDiscount }, [[{ field: 'telegram_id', exacly: user.invited_by }]]);
            await bot.sendMessage(user.invited_by, `*Пользователь @${escapeMarkdown(user.username)} сделал платный заказ*/n/n
            🎁 Вы получаете дополнительный бонус ${config.invite_discount} % на все`.format(), { parse_mode: 'Markdown' });
        }
    }

    await db.update(table, { accepted: 1, recive_key }, [[{
        field: 'id',
        exacly: offerId
    }]]);

    await bot.sendMessage(state.chatId, `*Заказ на ${offerClause} "${offer.title}" от @${escapeMarkdown(user.username)} подтвержден ✔️*`, { parse_mode: 'Markdown' });

    try {
        //рассылка пользователю
        await bot.sendMessage(user.telegram_id, `*Заказ на ${offerClause} "${offer.title}" подтвержден ✔️*/n/n
            Детали по заказу смотрите во вкладке "${tabNames[offerType]}"
            `.format(), createButtons([{
            text: 'На главную 🔙',
            data: 'main menu'
        }]));
    }
    catch {
        /** empty string */
    }
}

module.exports = confirmOffer;