const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const Time = require('@utils/time');
const textDayFormat = require('@utils/text-day-format');

//управленеи рассылками
async function mailingsMenageOptions(state) {
    const allMailings = await db.find('mailings');

    //проверка наличия рассылок
    if (!allMailings.length) await bot.sendMessage(state.chatId, '*Рассылки отсутствуют* ✊', { parse_mode: 'Markdown' });

    //присыланеи всех рассылок
    for (let mailing of allMailings) {

        //кнопки управления
        const buttons = createButtons([{
            text: 'Пересоздать 🔁',
            data: `EditMail=${mailing.id}`
        }, {
            text: 'Удалить ✖️',
            data: `DeleteMail=${mailing.id}`
        }])

        //сообщение
        const message = `
            *№${mailing.id} — ${mailing.title}*/n/n
            📨 *Тип рассылки:* ${mailing.send_type}/n
            ${mailing.repeats ? `🔁 *Повторять каждые:* ${textDayFormat(mailing.repeats / 86400)}` : `📅 *Отправка:* ${new Time(mailing.response_time).toFriendlyString()}`}/n
            👥 *Аудитория:* ${mailing.audience}/n/n
            ${mailing.content}
        `.format();

        //отправка
        await bot.sendMessage(state.chatId, message, buttons);
    }

    //опции управления
    state.options = createButtons([{
        text: 'Создать новую рассылку ➕',
        data: 'add mail'
    }, {
        text: 'Вернуться на главную 🔙',
        data: 'main menu'
    }]);

    //показать кнопки снова
    bot.sendMessage(state.chatId, '*Вы также можете добавить новую рассылку 👇*', state.options);
}

module.exports = mailingsMenageOptions;