const { getServices } = require('@services');
const { bot, db } = getServices();
const createButtons = require('@utils/create-buttons');

// подтверждение розыгрыша
async function confirmNewRaffle(state) {
    // сохраняем розыгрыш
    const raffleId = await db.insert('raffles', {
        title: state.data.newRaffleData.title,
        place: state.data.newRaffleData.place,
        raffle_date: state.data.newRaffleData.raffle_date,
        content: state.data.newRaffleData.content,
        price: state.data.newRaffleData.price
    });

    state.data.id = raffleId;

    // сохраняем призы в winners (привязка к розыгрышу, без победителя)
    if (state.data.newRaffleData.prizes && state.data.newRaffleData.prizes.length > 0) {
        for (let prize of state.data.newRaffleData.prizes) {
            await db.insert('winners', {
                raffle_id: raffleId,
                prize: prize,
                raffle_offer_id: null // пока без победителя
            });
        }
    }

    // кнопки действий
    state.recordStep('notify', '*Розыгрыш добавлен ✔️*', createButtons([
        { text: 'Сделать рассылку розыгрыша 📨', data: 'notify raffle' },
        { text: 'На главную 🔙', data: 'main menu' }
    ]));

    // выполняем шаг
    state.executeLastStep();
}

module.exports = confirmNewRaffle;
