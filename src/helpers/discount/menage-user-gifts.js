const { getServices } = require('@services');
const { bot, db } = getServices();
const { CONFIG_FILE } = require('@consts/file-paths');
const config = require(CONFIG_FILE);
const BOT_USERNAME = process.env.BOT_USERNAME;

//скидки пользователя
async function menageUserGifts(state) {

    //получение списка скидок
    let discounts = await db.find('discounts');

    //прверка пользователя на платный заказ
    const user = await db.find('users', [[{
        field: 'telegram_id',
        exacly: state.chatId
    }]], true)

    if (!discounts.length && !user.made_first_offer && !user.discount) {
        return await bot.sendMessage(state.chatId, `*Сделайте первый заказ, чтобы получить реферальную ссылку и 
        получать больше крутых бонусов 🎁🎁🎁*`.format(), state.options);
    }

    let message = '', referalPart = '';

    if (user.made_first_offer) {
        const base64UrlCommand = btoa(`invited_by=${user.invite_code}`);
        const urlCommand = `https://t.me/${BOT_USERNAME}?start=${base64UrlCommand}`;

        const discountClause = (config.for_invited_discount || config.invite_discount) ?
            `/n/n*Ваша реферальная ссылка 👇*/n\`\`\`${urlCommand}\`\`\`
             /n/n🎁 *Получайте скидку ${config.invite_discount} % за каждого друга, который оформит любой заказ по вашей реферальной ссылке. Другу — ${config.for_invited_discount} %*` : '';

        referalPart = `
        💯 *Ваша текущая скидка:* ${user.discount} %
        ${discountClause}`;
    }

    for (let item of discounts) {
        message += `🎁 *${item.title}* на ${item.category.toLowerCase()} — скидка ${item.discount}%/n/n`;
    }

    if (!discounts.length && !user.made_first_offer) {
        message += `💯 *Сделайте первый заказ, чтобы получить реферальную ссылку и 
        получать больше крутых бонусов!*/n/n🔥 *Ваша текущая скидка:* ${user.discount} % на все`;
    }

    await bot.sendMessage(state.chatId, (referalPart + message).format(), state.options);
}

module.exports = menageUserGifts;