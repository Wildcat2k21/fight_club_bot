const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const validateMarkdown = require('@utils/validate-markdown');
const Time = require('@utils/time');
const textDayFormat = require('@utils/text-day-format');

//управление новой рассылкой
async function handleMailMenagment(state, message) {

    if (message && validateMarkdown(message)) {
        const warnMessage = `🔁 *${validateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    //установка типа рассылки
    if (state.stepName === 'send type') {

        //значения
        const allowedValues = [
            'Периодическая',
            'Запланированная',
            'Моментальная'
        ];

        if (!allowedValues.includes(message)) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите тип рассылки\n\n(Периодическая/Запланированная/Моментальная)', state.options);
        }

        //установка данных
        state.data.newMailData = {
            send_type: message
        }

        //установка обарботчика
        state._actionHandleFunction = handleMailMenagment;

        //установка следующего шага
        state.recordStep('name', 'ℹ️ Введите название рассылки', createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }]));

        return state.executeLastStep();
    }

    //название
    if (state.stepName === 'name') {

        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название рассылки', state.options);
        }

        //установка данных
        state.data.newMailData.title = message;

        let varMessage;

        //если рассылка разовая, то перескочить к выбору аудитории
        if (state.data.newMailData.send_type === 'Моментальная') {
            //установка следующего шага
            state.recordStep('audience', 'ℹ️ Введите категорию для рассылки\n\nВсем/Участникам/Всем, кроме участников)', state.options);
            return state.executeLastStep();
        }
        else if (state.data.newMailData.send_type === 'Запланированная') {
            varMessage = 'ℹ️ Введите дату проведения рассылки/n/nВ формате *чч.мм.гг чч:мм*'.format();
        }
        else {
            varMessage = 'ℹ️ Введите период проведения рассылки в днях (не более 14)'.format();
        }

        state.data._dateAdviceMsg = varMessage;

        //установка следующего шага
        state.recordStep('date time', varMessage, state.options);
        return state.executeLastStep();
    }

    //дата проведения
    if (state.stepName === 'date time') {

        if (!message) {
            return bot.sendMessage(state.chatId, state.data._dateAdviceMsg, state.options);
        }

        //обработка
        if (state.data.newMailData.send_type === 'Запланированная') {
            if (!Time.isValid(message) || new Time().shortUnix() > new Time(message).shortUnix()) {
                return bot.sendMessage(state.chatId, `🔁 Пожалуйста, введите дату проведения рассылки/n/nВ формате *чч.мм.гг чч:мм*`, state.options);
            }

            state.data.newMailData.response_time = new Time(message).shortUnix();
        }
        else {
            if (isNaN(message) || Number(message) <= 0 || Number(message) > 14) {
                return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите период проведения рассылки в днях (не более 14)', state.options);
            }

            //ставить планируемое время в том числе и на переодические
            state.data.newMailData.repeats = message * 86400;
        }

        //установка следующего шага
        state.recordStep('audience', 'ℹ️ Введите категорию для рассылки\n\n(Всем/Участникам/Всем, кроме участников)', state.options);
        return state.executeLastStep();
    }

    //категория
    if (state.stepName === 'audience') {

        const allowedValues = [
            'Всем',
            'Участникам',
            'Всем, кроме участников'
        ];

        if (!allowedValues.includes(message)) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите категорию для рассылки\n\n(Всем/Участникам/Всем, кроме участников)', state.options);
        }

        //установка данных
        state.data.newMailData.audience = message;

        //установка следующего шага
        state.recordStep('content', 'ℹ️ Введите содержание рассылки', state.options);
        return state.executeLastStep();
    }

    //содержание
    if (state.stepName === 'content') {

        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите содержание рассылки', state.options);
        }

        //установка данных
        state.data.newMailData.content = message;

        //финальные кнопки управления
        const buttons = createButtons([{
            text: 'Отменить ✖️',
            data: 'main menu'
        }, {
            text: 'На шаг назад 🔙',
            data: 'step back'
        }, {
            text: 'Подвердить ✔️',
            data: 'confirm new mail'
        }]);

        //строка даты
        const sendingStroke = state.data.newMailData.send_type === 'Моментальная' ? '' :
            state.data.newMailData.repeats ? `🔁 *Повторять каждые:* ${textDayFormat(state.data.newMailData.repeats / 86400)}/n` :
                `📅 *Отправка:* ${new Time(state.data.newMailData.response_time).toFriendlyString()}/n`

        //сообщение
        const sendingMess = `
            *${state.data.newMailData.title}*/n/n
            📨 *Тип рассылки:* ${state.data.newMailData.send_type}/n
            ${sendingStroke}
            👥 *Аудитория:* ${state.data.newMailData.audience}/n/n
            ${state.data.newMailData.content}
        `.format();

        //установка следующего шага
        state.recordStep('confirm new mail', sendingMess, buttons);

        //выполнение шага
        return state.executeLastStep();
    }
}

module.exports = handleMailMenagment;