const { getServices } = require('@services');
const { bot } = getServices();
const createButtons = require('@utils/create-buttons');
const validateMarkdown = require('@utils/validate-markdown');
const Time = require('@utils/time');

// обработка заполнения нового розыгрыша
function handleRaffleManagement(state, message) {

    if (message && validateMarkdown(message)) {
        const warnMessage = `🔁 *${validateMarkdown(message)}*`;
        return bot.sendMessage(state.chatId, warnMessage, state.options);
    }

    // шаг 1: название розыгрыша
    if (state.stepName === 'name') {
        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите название розыгрыша', state.options);
        }

        state.data.newRaffleData = { title: message, prizes: [] };
        state._actionHandleFunction = handleRaffleManagement;

        state.recordStep('address', '📍 Введите адрес проведения розыгрыша', createButtons([
            { text: 'Отменить ✖️', data: 'main menu' },
            { text: 'На шаг назад 🔙', data: 'step back' }
        ]));

        return state.executeLastStep();
    }

    // шаг 2: адрес
    if (state.stepName === 'address') {
        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите адрес проведения розыгрыша', state.options);
        }

        state.data.newRaffleData.place = message;

        state.recordStep('date', '📅 Введите дату розыгрыша\n\nФормат: *"чч.мм.гггг чч:мм"*', state.options);
        return state.executeLastStep();
    }

    // шаг 3: дата
    if (state.stepName === 'date') {
        if (!message || !Time.isValid(message) || new Time().shortUnix() > new Time(message).shortUnix()) {
            return bot.sendMessage(state.chatId, '🔁 Введите корректную дату\n\nФормат: *"чч.мм.гггг чч:мм"*', state.options);
        }

        state.data.newRaffleData.raffle_date = new Time(message).shortUnix();

        state.recordStep('price', '💸 Введите цену билета (₽)', state.options);
        return state.executeLastStep();
    }

    // шаг 4: цена
    if (state.stepName === 'price') {
        if (!message || isNaN(message) || Number(message) < 0) {
            return bot.sendMessage(state.chatId, '🔁 Введите корректную цену в рублях ₽', state.options);
        }

        state.data.newRaffleData.price = Number(message);

        state.recordStep('content', '🤳 Введите пост о розыгрыше', state.options);
        return state.executeLastStep();
    }

    // шаг 5: пост
    if (state.stepName === 'content') {
        if (!message) {
            return bot.sendMessage(state.chatId, '🔁 Пожалуйста, введите текст поста о розыгрыше', state.options);
        }

        state.data.newRaffleData.content = message;

        // ⚠️ сразу отправляем на добавление приза (минимум 1 обязателен)
        state.recordStep('add_prize', '🎁 Введите название приза (к примеру: Наушники Marshal PRO cs43)/n/nРозыгрыш должен иметь хотя-бы 1 призовое место.'.format(), state.options);
        return state.executeLastStep();
    }

    // шаг 6: добавление приза
    if (state.stepName === 'add_prize') {
        if (!message) {
            // Опции с очисткой мест
            let newOptions;

            if(state.data.newRaffleData.prizes.length){
                newOptions = createButtons([
                    { text: 'Отменить ✖️', data: 'main menu' },
                    { text: 'Очистить призы ⏺️', data: 'clean prizes' },
                    { text: 'На шаг назад 🔙', data: 'step back' }
                ]);
            }

            return bot.sendMessage(state.chatId, '🎁 Введите название приза', newOptions || state.options);
        }

        state.data.newRaffleData.prizes.push(message);

        // готовим предпросмотр с кнопками
        const prizeClause = state.data.newRaffleData.prizes.length === 1 ? 
            "*🎁 Приз: *" : "/n*🎁 Призы:*/n";
            
        const prize = state.data.newRaffleData.prizes.length === 1 ?
            state.data.newRaffleData.prizes[0] + '/n':
            state.data.newRaffleData.prizes.map((p, i) => `${i + 1} место — ${p}/n`).join('');

        const buttons = createButtons([
            { text: 'Отменить ✖️', data: 'main menu' },
            { text: 'На шаг назад 🔙', data: 'step back' },
            { text: 'Добавить приз 🎁', data: 'step back' },
            { text: 'Подтвердить ✔️', data: 'confirm new raffle' }
        ]);

        const priceClause = Number(state.data.newRaffleData.price) ? `${state.data.newRaffleData.price} ₽` : "Бесплатно";

        state.recordStep('preview raffle', `
            *${state.data.newRaffleData.title}*/n/n
            📅 *Дата:* ${(new Time(state.data.newRaffleData.raffle_date)).toFriendlyString()}/n
            📍 *Адрес:* ${state.data.newRaffleData.place}/n
            🫰 *Цена билета:* ${priceClause}/n
            ${prizeClause}
            ${prize}/n
            
            ${state.data.newRaffleData.content}
        `.format(), buttons);

        return state.executeLastStep();
    }
}

module.exports = handleRaffleManagement;
