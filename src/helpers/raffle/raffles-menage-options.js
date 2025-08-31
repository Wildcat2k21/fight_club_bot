const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const Time = require('@utils/time');

// просмотр розыгрышей
async function rafflesMenageOptions(state) {
    const allRaffles = await db.find('raffles');

    const timeNow = new Time().shortUnix();

    // информация об отсутствии розыгрышей
    if (!allRaffles.length) {
        await bot.sendMessage(state.chatId, '*В ближайшее время розыгрышей не запланировано* 🎉', { parse_mode: 'Markdown' });
    }

    // отправка всех розыгрышей
    for (let raffle of allRaffles) {

        // кнопки управления розыгрышем
        const rafflesControlButtons = createButtons([
        {
            text: 'Подвести итоги 🎯',
            data: 'RaffleWinner=' + raffle.id
        },
        {
            text: 'Победители 🏆',
            data: 'CheckRaffleWinner=' + raffle.id
        },
        {
            text: 'Участники 👥',
            data: 'RaffleOffers=' + raffle.id
        },
        {
            text: 'Добавить участника 👤',
            data: 'addManualRaffleMember=' + raffle.id
        },
        {
            text: 'Удалить ✖️',
            data: 'DeleteRaffle=' + raffle.id
        }]);

        const priceClause = Number(raffle.price) ? `${raffle.price} ₽` : "Бесплатно";

        const prizesForRaffle = await db.find('raffle_winners', [[{field: 'raffle_id', exacly: raffle.id}]]);

        // готовим предпросмотр с кнопками
        const prizeClause = prizesForRaffle.length === 1 ?
            "*🎁 Приз: *" : "/n*🎁 Призы:*/n";

        const prizePart = prizesForRaffle.length === 1 ?
            prizesForRaffle[0].prize + '/n' :
            prizesForRaffle.map(({ prize }, i) => `${i + 1} место — ${ prize }/n`).join('');

        await bot.sendMessage(state.chatId, `
            *№${raffle.id} — ${raffle.title}*/n/n
            📅 *Дата проведения:* ${new Time(raffle.raffle_date).toFriendlyString()}/n
            📍 *Место проведения:* ${raffle.place}/n
            💰 *Цена участия:* ${priceClause} /n
            ${raffle.raffle_date < timeNow ? '*ℹ️ Розыгрыш уже прошёл*/n' : ''}
            ${prizeClause}
            ${prizePart}/n
            ${raffle.content}
                `.format(), rafflesControlButtons);
    }

    // кнопка добавления нового розыгрыша
    state.options = createButtons([{
        text: 'Создать новый розыгрыш ➕',
        data: 'add raffle'
    }, {
        text: 'На главную 🔙',
        data: 'main menu'
    }]);

    // предложение добавить новый розыгрыш
    return bot.sendMessage(state.chatId, '*Вы также можете добавить новый розыгрыш 👇*', state.options);
}

module.exports = rafflesMenageOptions;
