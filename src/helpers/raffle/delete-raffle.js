const { getServices } = require('@services');
const { bot, db } = getServices();

// удаление розыгрыша
async function deleteRaffle(state, raffleId) {
    // проверка существования розыгрыша
    const existRaffle = await db.find('raffles', [[{ field: 'id', exacly: raffleId }]], true);

    if (!existRaffle) {
        return await bot.sendMessage(
            state.chatId,
            '*Розыгрыш не найден* ✊',
            { parse_mode: 'Markdown' }
        );
    }

    // удаление из базы данных
    await db.delete('raffles', [[{
        field: 'id',
        exacly: raffleId
    }]]);

    await bot.sendMessage(
        state.chatId,
        `*Розыгрыш №${raffleId} удалён ✔️*`,
        state.options
    );
}

module.exports = deleteRaffle;
