const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');
const Time = require('@utils/time');

// обработка участников по розыгрышам
async function raffleOffersList(state, raffleId) {

    // получение данных
    const raffleOffers = await db.find('raffle_offers', [[{
        field: 'accepted', exacly: 1
    }, {
        field: 'raffle_id', exacly: raffleId
    }]]);

    // если участников пока нет
    if (!raffleOffers.length) {
        return bot.sendMessage(state.chatId, '*Участников пока нет* 🎟', { parse_mode: 'Markdown' });
    }

    // общее число участников
    await bot.sendMessage(state.chatId, `👥 *Всего участников:* ${raffleOffers.length}`, { parse_mode: 'Markdown' });

    // вывод участников
    for (let participant of raffleOffers) {

        // получаем юзера (если он есть в users)
        let currentUser = null;
        if (participant.user_telegram_id) {
            currentUser = await db.find('users', [[{
                field: 'telegram_id',
                exacly: participant.telegram_id
            }]], true);
        }

        // информация об участнике
        const message = `
            *ФИО:* ${escapeMarkdown(participant.fullname)}
            *Телефон:* ${escapeMarkdown(participant.phone)}
            ${participant.user_telegram_id && currentUser ? `*Телеграм:* @${escapeMarkdown(currentUser.username)}` : ''}
        `.format();

        await bot.sendMessage(state.chatId, message, { parse_mode: 'Markdown' });
    }

    await bot.sendMessage(state.chatId, '*Тут отображен список участников розыгрыша, участие которых вы подтвердили*', createButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

module.exports = raffleOffersList;
