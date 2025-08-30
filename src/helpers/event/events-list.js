const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const Time = require('@utils/time');
const calcOfferPayment = require('@helpers/offer/calc-offer-payment');

//просмотр событий и участие
async function eventsList(state) {
    //все события
    const allEvents = await db.find('events', [[{
        field: 'event_date',
        more: new Time().shortUnix()
    }]]);

    if (!allEvents.length) {
        return await bot.sendMessage(state.chatId, '*Тут будут отображены предстоящие мероприятия* ✊', state.options);
    }

    //вывод событий
    for (let event of allEvents) {

        //получение заказа на такое мероприятие
        const existOffer = await db.find('event_offers', [[{
            field: 'user_telegram_id',
            exacly: state.chatId
        }, {
            field: 'event_id',
            exacly: event.id
        }]], true)

        //кнопки участия
        const joinButtons = existOffer ? createButtons([{
            text: 'Заявка подана ✔️',
            data: 'member'
        }]) : createButtons([{
            text: 'Принять участие 🥊',
            data: 'JoinEvent=' + event.id
        }])

        const { to_pay, discountSum } = await calcOfferPayment(event, state, 'Участие');

        const priceClause = Number(to_pay) ? `${to_pay} ₽` : "Бесплатно 🔥🔥🔥";

        const weightClause = event.weight_from ?
            `от ${event.weight_from} до ${event.weight_to} кг` : "Любая";

        await bot.sendMessage(state.chatId, `*${event.title}*/n/n
        📅 *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
        🔻 *Место проведения:* ${event.place}/n
        🥊 *Весовая категория:* ${weightClause}/n
        ✊ *Участие*: ${priceClause} ${discountSum ? `/n🔥 *Скидка* — ${discountSum} %` : ''}/n/n
        ${event.content}`.format(), joinButtons);
    }
}

module.exports = eventsList;