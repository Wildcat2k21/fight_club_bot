const { getServices } = require('@services');
const { db, bot } = getServices();
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);
const { randCode } = require('@utils/other');

//регистрация нового пользователя
async function userRegistration(telegram_id, username, nickname, invited_by_key) {

    //проверка наличия имени пользователя в телеграме
    if (!username) {
        await bot.sendMessage(telegram_id, `Похоже, что при регистрации вы не указывали имя для связи с вами в телеграме 👇/n/n
        Перейдите в "настройки" - "мой аккаунт" - "имя пользователя" заполните поле и продолжите`.format(), createButtons([{
            text: 'готово 👌',
            data: 'default'
        }]));

        return new Error("Не передано имя в телеграм");
    }

    let invited_by, discount = 0, existInvitedBy;

    if (invited_by_key) {
        existInvitedBy = await db.find('users', [[{ field: 'invite_code', exacly: invited_by_key }]], true);
        if (existInvitedBy) {
            invited_by = existInvitedBy.telegram_id;
            discount = config.for_invited_discount;
        }
    }

    //будущий инвайт код
    let invite_code = randCode(6);

    //поиск пользователя с таким кодом
    while (await db.find('users', [[{ field: 'invite_code', exacly: invite_code }]], true)) {
        invite_code = randCode(6);
    }

    //данные для регистрации
    const newUserData = {
        telegram_id,
        invite_code,
        invited_by,
        username,
        discount,
        nickname
    }

    //регистрация пользователя
    return await db.insert('users', newUserData);
}

module.exports = userRegistration;