const createButtons = require('@utils/create-buttons');

//создание пользовательских опций
function adminOptions() {
    //кнопки пользовательского меню
    return createButtons([{
        text: 'Розыгрыши 🎯',
        data: 'menage raffles'
    },
    {
        text: 'Мероприятия 📍',
        data: 'menage events'
    },
    {
        text: 'Статистика 📈',
        data: 'stats'
    },
    {
        text: 'Заказы ℹ',
        data: 'menage offers'
    },
    {
        text: 'Товары 👑',
        data: 'menage merch'
    },
    {
        text: 'Рассылки 📨',
        data: 'menage notify'
    },
    {
        text: 'Страницы 📃',
        data: 'menage pages'
    },
    {
        text: 'Скидки 💯',
        data: 'menage gifts'
    }
    ]);
}

module.exports = adminOptions;