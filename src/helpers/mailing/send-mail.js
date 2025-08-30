const { getServices } = require('@services');
const { bot, db } = getServices();
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);
const createButtons = require("@utils/create-buttons");

//функция для рассыдки
async function sendMail(mail) {

    let userToMail;

    //обрбаотка сценариев
    switch (mail.audience) {
        case 'Всем': {
            const users = await db.find('users');
            userToMail = users;
            break;
        }
        case 'Участникам': {
            const eventOffers = await db.find('event_offers');
            userToMail = eventOffers;
            break;
        }
        case 'Всем, кроме участников': {
            const eventOffers = await db.find('event_offers');
            const users = await db.find('users');
            userToMail = users.filter(user => !eventOffers.some(participant => participant.telegram_id === user.telegram_id));
            break;
        }
    }

    //рассылка
    for (let user of userToMail) {

        if (user.telegram_id === ADMIN_TELEGRAM_ID) continue

        //Домой
        const homeButton = createButtons([{
            text: 'На главную 🔙',
            data: 'main menu'
        }])

        try {
            await bot.sendMessage(user.telegram_id, `
                *${mail.title}*/n/n
                ${mail.content}
            `.format(), homeButton);
        }
        catch { /* empty */ }
    }
}

module.exports = sendMail;