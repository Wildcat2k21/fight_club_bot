const { getServices } = require('@services');
const { db } = getServices();

const userRegistration = require('./user-registration');
const initState = require('@helpers/other/other');

//авторизация пользователя
async function authUser(sender, invited_by_key) {

    //проверка существования аккаунта
    let userData = await db.find('users', [[{
        field: 'telegram_id',
        exacly: sender.id
    }]], true);

    //флаг нового пользователя
    let isNewUser = false;

    //регистрация пользователя
    if (!userData) {

        const userId = await userRegistration(sender.id, sender.username, sender.first_name, invited_by_key);

        //выйти, если не указано имя в тг
        if (userId instanceof Error) return userId;

        //данные о новом пользователе
        userData = await db.find('users', [[{
            field: 'telegram_id',
            exacly: userId
        }]], true);

        isNewUser = true;
    }

    //инициализация состояния
    initState(userData);
    return isNewUser;
}

module.exports = authUser;