const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');

//управление заказами
async function offersMenageOptions(state) {
    const merchOffers = (await db.executeWithReturning('SELECT * FROM merch_offers')).map(item => ({ ...item, type: 'merch' }));
    const eventOffers = (await db.executeWithReturning('SELECT * FROM event_offers')).map(item => ({ ...item, type: 'event' }));
    const totalOffers = [...merchOffers, ...eventOffers];
    //вывод заказов, отсартированных по полю accepted 0
    const sortedOffers = totalOffers.sort((a, b) => a.accepted - b.accepted);

    //если заказов нет
    if (!sortedOffers.length) {
        return bot.sendMessage(state.chatId, '*Заказов не найдено* ✊', { parse_mode: 'Markdown' });
    }

    //вывод всех заказов
    for (let offer of sortedOffers) {

        const offerUser = await db.find('users', [[{
            field: 'telegram_id',
            exacly: offer.user_telegram_id
        }]], true);

        let buttons;

        const offerTypeCase = offer.type === 'merch' ? 'на товар' : 'на участие в мероприятии';

        const priceClause = Number(offer.to_pay) ? `${offer.to_pay} ₽` : "Бесплатно";

        //сообщение
        const message = `*Заказ ${offerTypeCase} №${offer.id}: "${offer.title}"*/n/n
        *Статус:* ${offer.accepted ? 'подтвержден ✔️' : 'Ожидает вашего подверждения ℹ'}/n
        *К оплате:* ${priceClause}/n/n
        👤 *От:* @${escapeMarkdown(offerUser.username)}/n
        `.format();

        //кнопки управления заказами
        if (!offer.accepted) {

            //кнопки на подтверждение
            buttons = createButtons([{
                text: 'Подтвердить ✔️',
                data: `AcceptOffer=${offer.type}:${offer.id}`
            }, {
                text: 'Отказать ✖️',
                data: `DeleteOffer=${offer.type}:${offer.id}`
            }], false);

        }

        //управление
        await bot.sendMessage(state.chatId, message, buttons || createButtons([{
            text: 'Удалить заказ ✖️',
            data: `DeleteOffer=${offer.type}:${offer.id}`
        }]));
    }

    state.options = createButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }])

    await bot.sendMessage(state.chatId, `ℹ *Удалить заказ можно после его подтверждения.*/n
    Рекомендуется это делать только после участия или получения товара. 
    В случае отказа заказ будет автоматически удален./n/n
    Рекомендуется проверять заказы пользователей на подленнсть с предоставлением их QR-кода. 
    После считывания вам будет доступна подробная информация о заявке, и заказ будет автоматически закрыт.`.format(), state.options);
}

module.exports = offersMenageOptions;