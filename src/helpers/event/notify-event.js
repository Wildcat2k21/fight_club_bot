const { getServices } = require('@services');
const { bot, db } = getServices();
const Time = require('@utils/time');
const sendMail = require('@mailing/send-mail');

//рассылка нового события
async function notifyEvent(state) {

    //получение этого мерча
    const event = await db.find('events', [[{
        field: 'id',
        exacly: state.data.id
    }]], true)

    const weightClause = event.weight_from ?
        `от ${event.weight_from} до ${event.weight_to} кг` : "Любая";

    const priceClause = Number(event.price) ? `${event.price} ₽` : "Бесплатно 🔥🔥🔥";

    const mailData = {
        audience: 'Всем',
        title: `У нас новое событие — ${event.title} 🔥/nУчастие: ${priceClause}`,
        content: `
        📅 *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
        🔻 *Место:* ${event.place}/n
        🥊 *Весовая категория:* ${weightClause}/n/n
        ${event.content}/n/n*Принять участие можно во вкладке "Ближайшие события"*`
    }

    await sendMail(mailData);
    state.default();
    await bot.sendMessage(state.chatId, '*Рассылка выполнена ✔️*', state.options);
}

module.exports = notifyEvent;