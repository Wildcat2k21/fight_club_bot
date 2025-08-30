const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const validateMarkdown = require('@utils/validate-markdown');

//приветственное сообщение
async function handleStartMessagePage(state, message) {

    if (message && validateMarkdown(message)) {
        const warnMessage = `🔁 *${validateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if (state.stepName === 'content') {

        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите приветственное сообщение', state.options);
        }

        state.data.newStartMessage = {
            content: message
        }

        state._actionHandleFunction = handleStartMessagePage;

        //управление
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Подтвердить ✔️',
            data: 'confirm start_message'
        }])

        state.recordStep('confirm start_message', `🤝 *Предосмотр приветственного сообщения*/n/n
            ${state.data.newStartMessage.content}
        `.format(), buttons);

        return state.executeLastStep();
    }
}

module.exports = handleStartMessagePage;