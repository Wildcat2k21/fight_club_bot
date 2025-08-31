const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const escapeMarkdown = require('@utils/escape-markdown');
const Time = require('@utils/time');

// обработка участников по розыгрышам
async function raffleOffersList(state, raffleId) {

    // получение данных
    const raffleTickets = await db.find('raffle_tickets', [[{
        field: 'accepted', exacly: 1
    }, {
        field: 'raffle_id', exacly: raffleId
    }]]);

    // если участников пока нет
    if (!raffleTickets.length) {
        return bot.sendMessage(state.chatId, '*Участников пока нет* 🎟', { parse_mode: 'Markdown' });
    }

    // вывод участников
    for (let ticket of raffleTickets) {

        // получаем юзера (если он есть в users)
        let currentUser = null;

        if (ticket.user_telegram_id) {
            currentUser = await db.find('users', [[{
                field: 'telegram_id',
                exacly: ticket.user_telegram_id
            }]], true);
        }

        // информация об участнике
        const message = `
            *Билет №${ticket.ticket_id}*/n/n
            👤 *ФИО:* ${ticket.fullname}/n
            📞 *Телефон:* ${ticket.phone}
            ${
                currentUser ?
                    `/n*💬 Контакт:* @${escapeMarkdown(currentUser.username)}` :
                    '/n/n*❗️ Участник указан вручную, билет не может быть проверен через QR код, связь с участником возможна только по телефону.*'
            }
        `.format();

        await bot.sendMessage(state.chatId, message, { parse_mode: 'Markdown' });
    }

    await bot.sendMessage(state.chatId, `
        👥 *Всего участников:* ${raffleTickets.length}/n/n
        *Тут отображен список участников розыгрыша, участие которых вы подтвердили*`.format(), createButtons([{
            text: 'На главную 🔙',
            data: 'main menu'
    }]));
}

module.exports = raffleOffersList;
