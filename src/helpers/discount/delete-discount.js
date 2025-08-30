const { getServices } = require('@services');
const { bot, db } = getServices();

//удаление скидки
async function deleteDiscount(state, discountId) {

    //проверка на существование скидки
    const discount = await db.find('discounts', [[{ field: 'id', exacly: discountId }]], true);

    if (!discount) {
        return await bot.sendMessage(state.chatId, '*Скидка не найдена ✊*', { parse_mode: 'Markdown' });
    }

    await db.delete('discounts', [[{
        field: 'id',
        exacly: discountId
    }]]);

    state.default();
    bot.sendMessage(state.chatId, `*Скидка №${discountId} удалена ✔️*`, state.options);
}

module.exports = deleteDiscount;