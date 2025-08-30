const { getServices } = require('@services');
const { bot, db } = getServices();
const sendMail = require('@mailing/send-mail');

//рассылка нового мерча
async function notifyMerch(state) {

    //получение этого мерча
    const merch = await db.find('merch', [[{
        field: 'id',
        exacly: state.data.id
    }]], true)

    const priceClause = Number(merch.price) ? `${merch.price} ₽` : "Бесплатно 🔥🔥🔥";

    const mailData = {
        audience: 'Всем',
        title: `У нас пополнение ассортимента — ${merch.title} 🔥/nза: ${priceClause}`,
        content: `${merch.content}/n/n*Заказать можно во вкладке "Заказать Мерч"*`
    }

    await sendMail(mailData);
    state.default();
    await bot.sendMessage(state.chatId, '*Рассылка выполнена ✔️*', state.options);
}

module.exports = notifyMerch;