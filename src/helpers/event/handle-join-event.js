const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const calcOfferPayment = require('@helpers/offer/calc-offer-payment');
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);

//участие в мероприятии
async function handleJoinEvent(state, message) {

    //eslint-disable-next-line no-useless-escape
    if (message && message.match(/[\*\(\)\[\]\`_]/g)) {
        const warnMessage = `🔁 *Ввод содержит запрещенные символы*/n/n
        Повторите ввод используя кириллицу, или латинские буквы`.format();
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if (state.stepName === 'fullname') {

        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите вашу фамилию, имя и отчество', state.options);
        }

        state.data.newParticipant = {
            fullname: message
        }

        state._actionHandleFunction = handleJoinEvent;

        //управление
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Отправить заявку ✔️',
            data: 'confirm join_event'
        }]);

        //получение события, для участия
        const event = await db.find('events', [[{
            field: 'id',
            exacly: state.data.id
        }]], true)

        //расчет оплаты
        const paymentDetails = await calcOfferPayment(event, state, 'Участие');
        state.data.to_pay = paymentDetails.to_pay;
        state.data.title = event.title;

        const weightClause = event.weight_from ?
            `от ${event.weight_from} до ${event.weight_to} кг` : "Любая";

        const referalClause = (config.invite_discount || config.for_invited_discount) ?
            `🎁 *Приглашайте друзей по реферальной ссылке в "Мои бонусы". 
             За каждого друга — ${config.invite_discount}%, другу — ${config.for_invited_discount}%*/n/n` : '';

        const priceClause = Number(paymentDetails.to_pay) ? `${paymentDetails.to_pay} ₽` : "Бесплатно 🔥🔥🔥";

        //следующий
        state.recordStep('confirm', `*${state.data.newParticipant.fullname}*/n/n
        🔥 *Событие:* ${event.title}/n
        🥊 *Весовая категория:* ${weightClause}/n
        ✊ *К оплате:* ${priceClause}/n
        💯 *Скидка:* ${paymentDetails.discountSum} %/n/n
        ${referalClause} ${config.payment_page}
        `.format(), buttons);

        return state.executeLastStep();
    }
}

module.exports = handleJoinEvent;