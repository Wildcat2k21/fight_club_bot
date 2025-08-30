const { getServices } = require('@services');
const { bot, db } = getServices();
const Time = require('@utils/time');
const sendMail = require('@mailing/send-mail');

// рассылка нового розыгрыша
async function notifyRaffle(state) {
    // получаем сам розыгрыш
    const raffle = await db.find('raffles', [[{
        field: 'id',
        exacly: state.data.id
    }]], true);

    // получаем призы
    const prizes = await db.find('winners', [[{
        field: 'raffle_id',
        exacly: raffle.id
    }]]);

    const priceClause = Number(raffle.price) ? `${raffle.price} ₽` : "Бесплатно 🎁";

    // готовим предпросмотр с кнопками
    const prizeClause = prizes.length === 1 ? 
        "*🎁 Приз: *" : "/n*🎁 Призы:*/n";
        
    const prizeList = prizes.length === 1 ?
        prizes[0].prize + '/n' :
        prizes.map(({ prize }, i) => `${i + 1} место — ${ prize }/n`).join('');

    const mailData = {
        audience: 'Всем',
        title: `Новый розыгрыш — ${raffle.title} 🎉/nБилеты: ${priceClause}`,
        content: `
        📅 *Дата розыгрыша:* ${new Time(raffle.raffle_date).toFriendlyString()}/n
        📍 *Адрес:* ${raffle.place}/n
        ${prizeClause}
        ${prizeList}/n
        ${raffle.content}/n/n
        *Принять участие можно во вкладке "Ближайшие события*`
    };

    await sendMail(mailData);
    state.default();
    await bot.sendMessage(state.chatId, '*Рассылка розыгрыша выполнена ✔️*', state.options);
}

module.exports = notifyRaffle;
