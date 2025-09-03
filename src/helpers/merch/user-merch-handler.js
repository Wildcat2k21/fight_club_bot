const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const calcOfferPayment = require('@helpers/offer/calc-offer-payment');

async function userMerchHandler(state) {

    //получение всех мерчей и объединиение с заказами
    const allMerch = await db.find('merch');

    if (!allMerch.length) {
        return await bot.sendMessage(state.chatId, '*Товары будут уже скоро* ✊', state.options);
    }

    for (let item of allMerch) {

        const { to_pay, discountSum } = await calcOfferPayment(item, state, 'Товары');

        const priceClause = Number(to_pay) ? `${to_pay} ₽` : "Бесплатно 🔥🔥🔥";

        const message = `*${item.title}*/n
        *Цена:* ${priceClause} ${discountSum ? `/n*Скидка* — ${discountSum} %` : ''}/n/n${item.content}
        `.format();

        const buttons = createButtons([{
            text: 'Заказать 🐾',
            data: `OfferMerch=${item.id}`
        }]);

        await bot.sendMessage(state.chatId, message, buttons);
    }

    await bot.sendMessage(state.chatId, '*Мы постоянно пополняем ассортимент* 💪', createButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

module.exports = userMerchHandler;