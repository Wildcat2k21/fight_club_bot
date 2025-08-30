const { getServices } = require('@services');
const { db } = getServices();

//расчет стоимости участия
async function calcOfferPayment(event, state, category) {

    //получение всех скидок
    const allDiscounts = await db.find('discounts', [[{
        field: 'category',
        exacly: 'Все'
    }], [{
        field: 'category',
        exacly: category
    }]]);

    let discountSum = 0;

    //повышение скидки
    for (let discount of allDiscounts) {
        if (discount.category === 'Все' || discount.category === category) {
            discountSum += discount.discount;
        }
    }

    //получение этого пользователя
    const thisUser = await db.find('users', [[{
        field: 'telegram_id',
        exacly: state.chatId
    }]], true);

    discountSum += thisUser.discount;

    //проверка, что скидка не больше 100%
    if (discountSum > 100) discountSum = 100;

    return { to_pay: event.price - (event.price * discountSum / 100), discountSum }
}

module.exports = calcOfferPayment;