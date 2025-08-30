const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const Time = require('@utils/time');
const QRCode = require('qrcode');

const BOT_USERNAME = process.env.BOT_USERNAME;

// участникам: объединённый просмотр заявок на мероприятия и розыгрыши
async function myParticipationsHandler(state) {
    // получаем все заявки пользователя из двух таблиц
    const eventOffers = await db.find('event_offers', [[{
        field: 'user_telegram_id',
        exacly: state.chatId
    }]]);

    const raffleOffers = await db.find('raffle_offers', [[{
        field: 'user_telegram_id',
        exacly: state.chatId
    }]]);

    // если нет ни там, ни там
    if (!eventOffers.length && !raffleOffers.length) {
        return bot.sendMessage(
            state.chatId,
            '*Вы пока нигде не участвуете* ✊\n\nПодайте заявку во вкладке *"Ближайщие события / Розыгрыши"* 👇',
            state.options
        );
    }

    // нормализуем элементы в единый массив с типом
    const normalized = [
        ...eventOffers.map(o => ({ ...o, _type: 'event' })),
        ...raffleOffers.map(o => ({ ...o, _type: 'raffle' }))
    ];

    // сортируем по created_at (если есть), иначе оставляем порядок
    normalized.sort((a, b) => {
        const ta = Number(a.created_at) || 0;
        const tb = Number(b.created_at) || 0;
        return tb - ta;
    });

    // перебираем и выводим
    for (let item of normalized) {
        try {
            if (item._type === 'event') {
                // родительское событие
                const event = await db.find('events', [[{ field: 'id', exacly: item.event_id }]], true);

                // fallback значения
                const title = item.title || (event && event.title) || 'Событие';
                const date = event ? new Time(event.event_date).toFriendlyString() : '—';
                const place = event ? event.place : '—';
                const priceClause = Number(item.to_pay) ? `${item.to_pay} ₽` : "Бесплатно";

                if (item.accepted) {
                    const param = `ConfirmJoinEvent=${item.recive_key || ''}`;
                    const base64 = Buffer.from(param).toString('base64');
                    const checkUrl = `https://t.me/${BOT_USERNAME}?start=${base64}`;
                    const qrCodeBuffer = await QRCode.toBuffer(checkUrl, { type: 'png' });

                    const caption = `
                        *Предъявите данный QR код на мероприятии*/n/n
                        *Событие:* ${title}/n
                        *Дата проведения:* ${date}/n
                        *Место:* ${place}/n
                        *Статус заявки:* Подтвержден ✔️
                    `.format();;

                    await bot.sendPhoto(state.chatId, qrCodeBuffer, {
                        caption,
                        parse_mode: 'Markdown'
                    });
                } else {
                    const message = `
                        *Событие:* ${title}/n
                        *Дата проведения:* ${date}/n
                        *Место:* ${place}/n
                        *Оплачено:* ${item.to_pay || 0} ₽/n
                        *Статус заявки:* Ожидает подтверждения/n/n
                        ℹ *После одобрения заявки у вас появится QR код участника*
                    `.format();

                    await bot.sendMessage(state.chatId, message, { parse_mode: 'Markdown' });
                }
            } else if (item._type === 'raffle') {
                // родительский розыгрыш
                const raffle = await db.find('raffles', [[{ field: 'id', exacly: item.raffle_id }]], true);

                const title = (raffle && raffle.name) || item.title || 'Розыгрыш';
                const date = raffle ? new Time(raffle.raffle_date).toFriendlyString() : '—';
                const place = raffle ? raffle.place : '—';
                const priceClause = Number(item.to_pay) ? `${item.to_pay} ₽` : "Бесплатно";

                if (item.accepted) {
                    const param = `ConfirmJoinRaffle=${item.recive_key || ''}`;
                    const base64 = Buffer.from(param).toString('base64');
                    const checkUrl = `https://t.me/${BOT_USERNAME}?start=${base64}`;
                    const qrCodeBuffer = await QRCode.toBuffer(checkUrl, { type: 'png' });

                    const caption = `
                        *Номер билета:* ${item.id}/n/n
                        *Розыгрыш:* ${title}/n
                        *Дата проведения:* ${date}/n
                        *Место:* ${place}/n
                        *Статус заявки:* Подтвержден ✔️/n/n
                        *Предъявите данный QR код на розыгрыше*
                    `.format();

                    await bot.sendPhoto(state.chatId, qrCodeBuffer, {
                        caption,
                        parse_mode: 'Markdown'
                    });
                } else {
                    const message = `
                        *Розыгрыш:* ${title}/n
                        *Дата проведения:* ${date}/n
                        *Адрес:* ${place}/n
                        *Оплачено:* ${item.to_pay || 0} ₽/n
                        *Статус заявки:* Ожидает подтверждения/n/n

                        ℹ *После одобрения заявки у вас появится QR код участника*
                    `.format();

                    await bot.sendMessage(state.chatId, message, { parse_mode: 'Markdown' });
                }
            }
        } catch (err) {
            // не ломаем всё из-за одной записи — логировать при необходимости
            console.error('myParticipationsHandler error:', err);
        }
    }

    // финальное сообщение и кнопка назад
    return bot.sendMessage(
        state.chatId,
        '*Здесь отображены ваши заявки на мероприятия и розыгрыши*',
        createButtons([{ text: 'На главную 🔙', data: 'main menu' }])
    );
}

module.exports = myParticipationsHandler;
