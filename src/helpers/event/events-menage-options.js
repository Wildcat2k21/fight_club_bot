const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const Time = require('@utils/time');

//просмотр событий
async function eventsMenageOptions(state) {
    const allEvents = await db.find('events');

    const timeNow = new Time().shortUnix();

    //информация об отсутствии событий
    if (!allEvents.length) {
        await bot.sendMessage(state.chatId, '*В ближайшее время событий не запланировано* ✊', { parse_mode: 'Markdown' });
    }

    //отправка всех событий
    for (let event of allEvents) {

        //кнопки управления событиями
        const eventsControlButtons = createButtons([{
            text: 'Участники 👥',
            data: `EventOffers=${event.id}`
        },{
            text: 'Пересоздать 🔁',
            data: 'EditEvent=' + event.id
        },{
            text: 'Удалить ✖️',
            data: 'DeleteEvent=' + event.id
        }])

        const weightClause = event.weight_from ?
            `от ${event.weight_from} до ${event.weight_to} кг` : "Любая";

        const priceClause = Number(event.price) ? `${event.price} ₽` : "Бесплатно";

        await bot.sendMessage(state.chatId, `
            *№${event.id} — ${event.title}*/n/n
            📅 *Дата проведения:* ${new Time(event.event_date).toFriendlyString()}/n
            🔻 *Место проведения:* ${event.place}/n
            🥊 *Весовая категория:* ${weightClause}/n
            🫰 *Цена за участие:* ${priceClause}/n
            ${event.event_date < timeNow ? '*ℹ️ Событие прошло*/n' : ''}/n
            ${event.content}
        `.format(), eventsControlButtons);
    }

    //кнопка добавления нового события
    state.options = createButtons([{
        text: 'Создать новое событие ➕',
        data: 'add event'
    }, {
        text: 'На главную 🔙',
        data: 'main menu'
    }]);

    //добавить новый заказ
    return bot.sendMessage(state.chatId, '*Вы также можете добавить новое событие 👇*', state.options);
}

module.exports = eventsMenageOptions;