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

    // сохраняем призы в raffle_winners (привязка к розыгрышу, без победителя)
    if (state.data.newRaffleData.prizes && state.data.newRaffleData.prizes.length > 0) {
        const items = state.data.newRaffleData.prizes;
        for (let i = 0; i < items.length; i++) {
            const prize = items[i];
            await db.insert('raffle_winners', {
                position: i + 1,
                raffle_id: raffleId,
                prize: prize,
                raffle_ticket_id: null // пока без победителя
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
