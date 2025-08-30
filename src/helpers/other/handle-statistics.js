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

    //получение подтвержденных заказов на участие и мерчи
    const cashFromMerch = await db.executeWithReturning('SELECT SUM(to_pay) FROM merch_offers WHERE accepted = 1')
    const cashFromEvent = await db.executeWithReturning('SELECT SUM(to_pay) FROM event_offers WHERE accepted = 1')
    const totalCash = cashFromMerch[0]['SUM(to_pay)'] + cashFromEvent[0]['SUM(to_pay)'];

    //вывод данных
    const message = `
        👥 Всего пользователей:  ${totalUsers[0]['COUNT(*)']}/n
        📍 Всего событий: ${totalEvents[0]['COUNT(*)']}/n
        👑 Всего мерчей: ${totalMerch[0]['COUNT(*)']}/n
        🥊 Всего участников:  ${totalParticipants[0]['COUNT(*)']}/n
        📨 Всего рассылок:  ${totalNews[0]['COUNT(*)']}/n
        💯 Всего скидок:  ${totalDiscounts[0]['COUNT(*)']}/n/n
        💸 *Прибыль с мерчей:* ${cashFromMerch[0]['SUM(to_pay)'] || 0} ₽/n
        💸 *Прибыль с участников:* ${cashFromEvent[0]['SUM(to_pay)'] || 0} ₽/n
        🫰 *Прибыль суммарно:* ${totalCash || 0} ₽/n
    `.format();

    bot.sendMessage(state.chatId, message, state.options);
}

module.exports = handleStatistics;