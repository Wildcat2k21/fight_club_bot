const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');
const Time = require('@utils/time');
const BOT_USERNAME = process.env.BOT_USERNAME;
const QRCode = require('qrcode');

//мои мерч
async function myMerchOffer(state) {

    //получение всех мерчей и объединиение с заказами
    const myMerch = (await db.find('merch_offers', [[{
        field: 'user_telegram_id', exacly: state.chatId
    }]]));

    if (!myMerch.length) {
        return await bot.sendMessage(state.chatId, '*У вас пока отсутствуют заказы* ✊\n\nЗакажи свой уникальный товар в *"Купить"* 👇', state.options);
    }

    for (let item of myMerch) {

        //одобренный заказ
        if (item.accepted) {

            //подтверждение заказа
            const base64UrlCommand = btoa(`ConfirmMerch=${item.recive_key}`);
            const checkofferUrl = `https://t.me/${BOT_USERNAME}?start=${base64UrlCommand}`

            //qr-код получения заказа
            const qrCodeBuffer = await QRCode.toBuffer(checkofferUrl, { type: 'png' });

            const message = `*Предъявите данный QR код для получения заказа*/n/n
            *${item.title}*/n*Статус заказа:* Подтвержден ✔️/n
            *Заказан:* ${new Time(item.created_at).toFriendlyString()}`.format();

            //сообщение
            await bot.sendPhoto(state.chatId, qrCodeBuffer, {
                caption: message,
                parse_mode: 'Markdown'
            });
        }
        //ожидающий
        else {

            const priceClause = Number(item.to_pay) ? `${item.to_pay} ₽` : "Бесплатно";

            const message = `*${item.title}*/n
                *Цена:* ${priceClause}/n
                *Заказан:* ${new Time(item.created_at).toFriendlyString()}/n/n
                *Статус заказа:* Ожидает подверждения ℹ
            `.format();

            await bot.sendMessage(state.chatId, message, { parse_mode: 'Markdown' });
        }
    }

    await bot.sendMessage(state.chatId, '*После подтверждения заказа вам доступен QR код для получения товара* 💪', createButtons([{
        text: 'На главную 🔙',
        data: 'main menu'
    }]));
}

module.exports = myMerchOffer;