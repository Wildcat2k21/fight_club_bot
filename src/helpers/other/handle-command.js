const { getServices } = require('@services');
const { db, bot } = getServices();
const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);
const escapeMarkdown = require('@utils/escape-markdown');
const Time = require('@utils/time');

// обработка команды
async function handleCommand(commandData) {

    const allowedCommands = ['ConfirmMerch', 'ConfirmJoinEvent', 'ConfirmJoinRaffle'];

    if (!allowedCommands.includes(Object.keys(commandData)[0])) {
        return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Недопустимая команда`);
    }

    if (!Object.values(commandData)[0]) {
        return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Команда не имеет значения`);
    }

    // --- MERCH ---
    if (Object.keys(commandData)[0] === 'ConfirmMerch') {
        const thisReciveKey = commandData.ConfirmMerch;
        const checkOffer = await db.find('merch_offers', [[{
            field: 'recive_key',
            exacly: thisReciveKey
        }]], true);

        if (!checkOffer) {
            return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Заказ не найден`);
        }

        const thisUser = await db.find('users', [[{ field: 'telegram_id', exacly: checkOffer.user_telegram_id }]], true);

        await db.delete('merch_offers', [[{ field: 'recive_key', exacly: thisReciveKey }]]);

        await bot.sendMessage(ADMIN_TELEGRAM_ID, `
            *Подпись подленная* ✔️/n/n
            *Мерч:* "${checkOffer.title}"/n
            *От:* @${escapeMarkdown(thisUser.username)} ${thisUser.nickname}/n
            *Оплатил:* ${checkOffer.to_pay} ₽/n/n
            *Заказан:* ${new Time(checkOffer.created_at).toFormattedString(false)}/n
            *Заказ закрыт* ✊
        `.format(), { parse_mode: 'Markdown' });

        return await bot.sendMessage(thisUser.telegram_id, `*Ваш заказ на мерч "${checkOffer.title}" закрыт* ✔️`, { parse_mode: 'Markdown' });
    }

    // --- EVENT ---
    if (Object.keys(commandData)[0] === 'ConfirmJoinEvent') {
        const thisReciveKey = commandData.ConfirmJoinEvent;
        const checkOffer = await db.find('event_offers', [[{
            field: 'recive_key',
            exacly: thisReciveKey
        }]], true);

        if (!checkOffer) {
            return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Заказ не найден`);
        }

        const thisUser = await db.find('users', [[{ field: 'telegram_id', exacly: checkOffer.user_telegram_id }]], true);

        await db.delete('event_offers', [[{ field: 'recive_key', exacly: thisReciveKey }]]);

        await bot.sendMessage(ADMIN_TELEGRAM_ID, `
            *Подпись подленная* ✔️/n/n
            *Событие:* "${checkOffer.title}"/n
            *ФИО участника:* "${checkOffer.fullname}"/n
            *От:* @${escapeMarkdown(thisUser.username)} ${thisUser.nickname}/n
            *Оплатил:* ${checkOffer.to_pay} ₽/n/n
            *Заказан:* ${new Time(checkOffer.created_at).toFormattedString(false)}/n
            *Заказ закрыт* ✊
        `.format(), { parse_mode: 'Markdown' });

        return await bot.sendMessage(thisUser.telegram_id, `*Ваш заказ на событие "${checkOffer.title}" закрыт* ✔️`, { parse_mode: 'Markdown' });
    }

    // --- RAFFLE (не удаляем заказ, только показываем инфо и тикет) ---
    if (Object.keys(commandData)[0] === 'ConfirmJoinRaffle') {
        const thisReciveKey = commandData.ConfirmJoinRaffle;
        const checkOffer = await db.find('raffle_offers', [[{
            field: 'recive_key',
            exacly: thisReciveKey
        }]], true);

        if (!checkOffer) {
            return bot.sendMessage(ADMIN_TELEGRAM_ID, `ℹ Билет не найден`);
        }

        // пытаемся получить пользователя (в разных вариантах поля)
        const userTelegramId = checkOffer.user_telegram_id || checkOffer.telegram_id || null;
        const thisUser = userTelegramId
            ? await db.find('users', [[{ field: 'telegram_id', exacly: userTelegramId }]], true)
            : null;

        // подтянем сам розыгрыш, если есть
        const raffle = checkOffer.raffle_id
            ? await db.find('raffles', [[{ field: 'id', exacly: checkOffer.raffle_id }]], true)
            : null;

        // сообщение админу — НЕ удаляем запись
        await bot.sendMessage(ADMIN_TELEGRAM_ID, `
            *Билет проверен и прошел подленность* ✔️/n
            *Номер билета:* ${checkOffer.id}/n
            *Розыгрыш:* "${raffle ? raffle.title : (checkOffer.title || '—') }"/n/n
            *ФИО держателя:* "${checkOffer.fullname}"/n
            ${thisUser ? `*От:* @${escapeMarkdown(thisUser.username)} ${thisUser.nickname}/n` : ''}
            *Телефон:* ${checkOffer.phone || '—'}/n
            *Оплатил:* ${checkOffer.to_pay || 0} ₽/n/n
            *Выдан:* ${new Time(checkOffer.created_at).toFormattedString(false)}/n
            *Билет будет удален после удаления розыгрыша* 
        `.format(), { parse_mode: 'Markdown' });

        // уведомление держателю билета (если он есть в users)
        if (thisUser && thisUser.telegram_id) {
            await bot.sendMessage(thisUser.telegram_id, `
                *Номер билета:* ${checkOffer.id}/n/n
                *Розыгрыш:* "${raffle ? raffle.title : (checkOffer.title || '—') }"/n
                *Статус:* Билет показан и подтверждён ✔️
            `.format(), { parse_mode: 'Markdown' });
        }

        // не удаляем запись, просто возвращаем успех админу
        return;
    }
}

module.exports = handleCommand;
