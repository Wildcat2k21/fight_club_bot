const { getServices } = require('@services');
const { bot, db } = getServices();

//подтверждение скидки
async function confirmNewDiscount(state) {

    let message = '';

    if (state.data.replaceDiscountId) {
        await db.update('discounts', state.data.newDiscountData, [[{
            field: 'id',
            exacly: state.data.replaceDiscountId
        }]]);

        message = `*Скидка №${state.data.replaceDiscountId} обновлена ✔️*`;
    }
    else {
        await db.insert('discounts', state.data.newDiscountData);
        message = '*Скидка добавлена ✔️*';
    }

    state.default();
    bot.sendMessage(state.chatId, message, state.options);
}

module.exports = confirmNewDiscount;