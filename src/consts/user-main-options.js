const createButtons = require('@utils/create-buttons');

//создание пользовательских опций
function userMainOptions() {
    //кнопки пользовательского меню
    return createButtons([
    {
        text: 'Ближайшие события 🔥',
        data: 'events'
    },
    {
        text: 'Купить 🐾',
        data: 'merch'
    },
    {
        text: 'Участникам 🏆',
        data: 'member'
    },
    {
        text: 'Мои покупки ✊',
        data: 'my merch'
    },
    {
        text: 'Мои бонусы 💯',
        data: 'gifts'
    },
    {
        text: 'О нас 🤝',
        data: 'about'
    }]);
}

module.exports = userMainOptions;