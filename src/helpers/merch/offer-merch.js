const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const calcOfferPayment = require('@helpers/offer/calc-offer-payment');
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);

//заказ мерча
async function offerMerch(state, merchId) {

    //получение мерча
    const merch = await db.find('merch', [[{
        field: 'id',
        exacly: merchId
    }]], true);

    //расчет оплаты
    const { to_pay, discountSum } = await calcOfferPayment(merch, state, 'Мерчи');

    //заполнение состояния
    state.data.id = merchId;
    state.data.title = merch.title;
    state.data.to_pay = to_pay;

    const referalClause = (config.invite_discount || config.for_invited_discount) ?
    `🎁 *Приглашайте друзей по реферальной ссылке в "Мои бонусы". 
     За каждого друга — ${config.invite_discount}%, другу — ${config.for_invited_discount}%*/n/n` : '';

    const priceClause = Number(to_pay) ? `${to_pay} ₽` : "Бесплатно 🔥🔥🔥";

    //сообщение
    const message = `
        *${merch.title}*/n
        ✊ *К оплате:* ${priceClause}/n
        💯 *Скидка:* ${discountSum} %/n/n
        ${referalClause} ${config.payment_page}
    `.format();

    //кнопки управления
    state.options = createButtons([{
        text: 'На главную 🔙',
        data: `main menu`
    }, {
        text: 'Заказать ✔️',
        data: 'confirm'
    }]);

    await bot.sendMessage(state.chatId, message, state.options);
}

module.exports = offerMerch;