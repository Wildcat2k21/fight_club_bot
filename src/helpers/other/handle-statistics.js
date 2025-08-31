const { getServices } = require('@services');
const { bot, db } = getServices();

//статистика сервера
async function handleStatistics(state) {

    //получение данных
    const totalUsers = await db.executeWithReturning('SELECT COUNT(*) FROM users');
    const totalEvents = await db.executeWithReturning('SELECT COUNT(*) FROM events')
    const totalMerch = await db.executeWithReturning('SELECT COUNT(*) FROM merch')
    const totalParticipants = await db.executeWithReturning('SELECT COUNT(*) FROM event_offers')
    const totalNews = await db.executeWithReturning('SELECT COUNT(*) FROM mailings')
    const totalDiscounts = await db.executeWithReturning('SELECT COUNT(*) FROM discounts')

    //вывод данных
    const message = `
        👥 Всего пользователей:  ${totalUsers[0]['COUNT(*)']}/n
        📍 Всего событий: ${totalEvents[0]['COUNT(*)']}/n
        👑 Всего товаров: ${totalMerch[0]['COUNT(*)']}/n
        🥊 Всего участников:  ${totalParticipants[0]['COUNT(*)']}/n
        📨 Всего рассылок:  ${totalNews[0]['COUNT(*)']}/n
        💯 Всего скидок:  ${totalDiscounts[0]['COUNT(*)']}
    `.format();

    bot.sendMessage(state.chatId, message, state.options);
}

module.exports = handleStatistics;