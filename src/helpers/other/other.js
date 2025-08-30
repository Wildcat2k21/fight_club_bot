const { getServices } = require('@services');
const { states, bot } = getServices();

const createState = require('@utils/create-state');
const adminOptions = require('@consts/admin-options');
const userMainOptions = require('@consts/user-main-options');

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

//инициадизация состояния
function initState(userData) {
    //добавление состояние в случае отсутсвия
    if (!states.find(item => item.chatId === userData.telegram_id)) {
        //опции пользовательского меню
        const options = userData.telegram_id === ADMIN_TELEGRAM_ID ? adminOptions() : userMainOptions()
        const state = createState(userData, bot);
        state.options = options;

        //состояние
        states.push(state);
    }
}

module.exports = initState;