const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const Time = require('@utils/time');

// просмотр розыгрышей и участие
async function rafflesList(state) {
    // все будущие розыгрыши
    const allRaffles = await db.find('raffles', [[{
        field: 'raffle_date',
        more: new Time().shortUnix()
    }]]);

    if (!allRaffles.length) {
        return await bot.sendMessage(
            state.chatId,
            '*Тут будут отображены предстоящие розыгрыши* 🎉',
            state.options
        );
    }

    const timeNow = new Time().shortUnix();

    // вывод розыгрышей
    for (let raffle of allRaffles) {
        // проверяем, есть ли заявка на участие от текущего юзера
        const existOffer = await db.find('raffle_offers', [[{
            field: 'user_telegram_id',
            exacly: state.chatId
        }, {
            field: 'raffle_id',
            exacly: raffle.id
        }]], true);

        // кнопки участия
        const joinButtons = existOffer
            ? createButtons([{ text: 'Заявка подана ✔️', data: 'member' }])
            : createButtons([{ text: 'Принять участие 🎉', data: 'JoinRaffle=' + raffle.id }]);

        // цена участия
        const priceClause = Number(raffle.price) ? `${raffle.price} ₽` : "Бесплатно 🔥🔥🔥";

        // призы для розыгрыша
        const prizesForRaffle = await db.find('winners', [[{ field: 'raffle_id', exacly: raffle.id }]]);

        const prizeClause = prizesForRaffle.length === 1
            ? "*🎁 Приз:*"
            : "/n*🎁 Призы:*/n";

        const prizePart = prizesForRaffle.length === 1
            ? prizesForRaffle[0].prize + '/n'
            : prizesForRaffle.map(({ prize }, i) => `${i + 1} место — ${prize}/n`).join('');

        // сообщение предпросмотра
        await bot.sendMessage(state.chatId, `
            *${raffle.title}*/n/n
            📅 *Дата проведения:* ${new Time(raffle.raffle_date).toFriendlyString()}/n
            📍 *Место проведения:* ${raffle.place}/n
            💰 *Цена участия:* ${priceClause}/n
            ${raffle.raffle_date < timeNow ? '*ℹ️ Розыгрыш уже прошёл*/n' : ''}
            ${prizeClause}
            ${prizePart}/n
            ${raffle.content}
        `.format(), joinButtons);
    }
}

module.exports = rafflesList;
