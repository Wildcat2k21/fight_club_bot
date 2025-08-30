//создание основных опцией
function createButtons(keyboard, vertial = true, parseMarkdown = true) {
    let buttons = [];

    //для вертикальных кнопок
    if(vertial){
        buttons = keyboard.map(item => {
            return [{
                text: item.text,
                callback_data: item.data
            }]
        })
    }
    //для горизонтальных кнопок
    else{
        buttons = [keyboard.map(item => {
            return {
                text: item.text,
                callback_data: item.data
            }
        })]
    }
    
    //возвращаем опции
    return {
        reply_markup: {
            inline_keyboard: buttons
        },
        parse_mode: parseMarkdown ? 'Markdown' : null
    }

}

module.exports = createButtons;