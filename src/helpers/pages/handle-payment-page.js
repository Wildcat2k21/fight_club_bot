const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const validateMarkdown = require('@utils/validate-markdown');

//приветственное сообщение
async function handlePaymentPage(state, message) {

    if (message && validateMarkdown(message)) {
        const warnMessage = `🔁 *${validateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if (state.stepName === 'content') {

        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите содержание для страницы оплаты', state.options);
        }

        state.data.newPaymentPage = {
            content: message
        }

        state._actionHandleFunction = handlePaymentPage;

        //управление
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Подтвердить ✔️',
            data: 'confirm payment_page'
        }])

        state.recordStep('confirm payment_page', `🫰 *Предосмотр страницы оплаты*/n/n
            ${state.data.newPaymentPage.content}
        `.format(), buttons);

        return state.executeLastStep();
    }
}

module.exports = handlePaymentPage;