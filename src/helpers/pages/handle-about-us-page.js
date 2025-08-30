const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const validateMarkdown = require('@utils/validate-markdown');

//О нас
async function handleAboutUsPage(state, message) {

    if (message && validateMarkdown(message)) {
        const warnMessage = `🔁 *${validateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    if (state.stepName === 'content') {

        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите содержание для вкладки "О нас"', state.options);
        }

        state.data.newAboutUs = {
            content: message
        }

        state._actionHandleFunction = handleAboutUsPage;

        //управление
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Подтвердить ✔️',
            data: 'confirm about_us'
        }])

        state.recordStep('confirm about_us', `👋 *Предосмотр вкладки "О нас"*/n/n
            ${state.data.newAboutUs.content}
        `.format(), buttons);

        return state.executeLastStep();
    }
}

module.exports = handleAboutUsPage;