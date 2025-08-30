const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);
const fs = require('fs/promises');

//измение скидки за приглашение
async function handleEditDiscount(state, message) {

    const valuesCheck = message.match(/^Приглашение=\d+\sПриглашенному=\d+$/g);

    if (!valuesCheck) {
        return await bot.sendMessage(state.chatId, `ℹ️ Некорректное значение. Пример ввода:/n/n"Приглашение=50 Приглашенному=25"`.format(), state.options);
    }

    //обновление config
    const invitedValue = message.split(' ')[0].replace('Приглашение=', '');
    const forInvitedValue = message.split(' ')[1].replace('Приглашенному=', '');

    if (invitedValue > 100 || invitedValue < 0) {
        return await bot.sendMessage(state.chatId, `ℹ️ Некорректное значение. скидка "Приглашенному" должна быть в диапозоне от 0 до 100.`.format(), state.options);
    }

    if (forInvitedValue > 100 || forInvitedValue < 0) {
        return await bot.sendMessage(state.chatId, `ℹ️ Некорректное значение. Скидка за "Приглашение" должно быть в диапозоне от 0 до 100.`.format(), state.options);
    }

    //обновление config
    config.invite_discount = Number(invitedValue);
    config.for_invited_discount = Number(forInvitedValue);

    //обновление config.json
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    state.default();

    await bot.sendMessage(state.chatId, `*Скидки обновлены ✔️*`, createButtons([{ text: 'На главную 🔙', data: 'main menu' }]));
}

module.exports = handleEditDiscount;