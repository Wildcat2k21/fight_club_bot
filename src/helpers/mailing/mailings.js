const { getServices } = require("@services");
const Time = require('@utils/time');
const sendMail = require('@mailing/send-mail');
const textDayFormat = require('@utils/text-day-format');
let { mailingsTimers, db, bot } = getServices();

const ADMIN_TELEGRAM_ID = Number(process.env.ADMIN_TELEGRAM_ID);

//инициализация таймеров и таймаутов рассылок
async function mailingSender(mail, callbackMessage, deleteAfter = false) {

    //отправка сообщения
    await sendMail(mail);

    //удаление сообщения
    if (deleteAfter) {
        await db.delete('mailings', [[{ field: 'id', exacly: mail.id }]])
    }

    if (callbackMessage) {
        //уведомление администратора
        await bot.sendMessage(...Object.values(callbackMessage));
    }
}

// let mailingsTimers = [];

//для очистки таймаутов и таймеров
function clearTimer(timerId) {
    // Очищаем и таймауты, и интервалы
    clearTimeout(timerId);  // работает и с таймаутами, и с интервалами
}

//обновленеи таймаутов и таймеров
async function updateMailingTimer(mailingId) {

    //таймут на замену
    const changedMailingTimer = mailingsTimers.find(item => item.id == mailingId);

    if (changedMailingTimer) {
        clearTimer(changedMailingTimer.timerId);
        mailingsTimers = mailingsTimers.filter(item => item.id != mailingId);
    }

    //поиск рассылки
    const mailing = await db.find('mailings', [[{ field: 'id', exacly: mailingId }]], true);

    //обновление таймаута
    if (mailing) setMailingTimer(mailing);
}

async function initMailingsTimers() {
    const allMails = await db.find('mailings');

    //инициализация рассылок    
    for (let mail of allMails) {
        setMailingTimer(mail);
    }
}

//установка таймаута
function setMailingTimer(mail) {

    const timeNow = new Time().shortUnix();

    //уведомление администратора
    const message = {
        chatId: ADMIN_TELEGRAM_ID, text: '',
        options: { parse_mode: 'Markdown' }
    }

    //проверка типа письма и сроков
    if (mail.send_type === "Запланированная" && timeNow <= mail.response_time) {
        //уведомление администратора
        message.text = `*Запланированная рассылка №${mail.id} выполнена и очищена* ✔️`;

        //инициализация таймеров и таймаутов рассылок
        const timerId = setTimeout(() => mailingSender(mail, message, true), (mail.response_time - timeNow) * 1000);

        mailingsTimers.push({ id: mail.id, timerId });
    }

    //проверка типа письма и сроков
    if (mail.send_type === "Периодическая") {
        //уведомление администратора
        message.text = `*Переодическая рассылка №${mail.id} выполнена ✔️*/n/n
        Следующая отправка через: ${textDayFormat(mail.repeats / 86400)}`.format();

        //инициализация таймеров и таймаутов рассылок
        const timerId = setInterval(() => mailingSender(mail, message), mail.repeats * 1000);

        mailingsTimers.push({ id: mail.id, timerId });
    }
}

module.exports = { initMailingsTimers, updateMailingTimer };