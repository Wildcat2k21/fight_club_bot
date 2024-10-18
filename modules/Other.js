
const fs = require('fs');
const Time = require('./Time.js');

function RandCode(length = 6) {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
    }
    return result;
}

//создание состояния
function CreateState(userData, bot){
    return{
        _lastOptions: {},
        _defaultOptions: {},
        _steps: [],
        recordStep: function(name, message, options){
            this._steps.push({
                name,
                message,
                options
            });

            return {
                execute: this.executeLastStep
            }
        },

        currentStep: function(){
            return this._steps[this._steps.length - 1]
        },
        get stepName(){
            return this.currentStep().name   
        },
        default: function(){
            this.data = {};
            this._steps = [];
            this.action = 'default';
            this._lastOptions = this._defaultOptions;

            //удаление функции-обработчика
            if(this._actionHandleFunction){
                delete this._actionHandleFunction
            }
        },
        stepBack: function(){
            if(this._steps.length > 1){
                this._steps.pop();
            }
        },
        executeLastStep: function(){
            const message = this._steps[this._steps.length - 1].message;
            const options = this._steps[this._steps.length - 1].options;
            const name = this._steps[this._steps.length - 1].name;
            bot.sendMessage(this.chatId, message, options);
            return name
        },
        set options(options){
            if(!Object.keys(this._defaultOptions).length){
                this._defaultOptions = options;
            }

            this._lastOptions = options;
        },
        get options(){
            let lastStep = this.currentStep(), options = null;
            if(lastStep) options = lastStep.options;
            return options || Object.assign({}, this._lastOptions)
        },
        chatId: userData.telegram_id,
        action: 'default',
        data: {},

        callTimeoutLimit(time, name, maxCall = 1, callback) {

            //поиск такого интервала
            let timeItem = this._timeouts.find(item => item.name === name);
    
            if(!timeItem){
                const timeoutObj = {
                  name,
                  timeoutId: null,
                  called: 0,
                  maxCall
              };
              
              // Добавляем объект в массив
              this._timeouts.push(timeoutObj);
              timeItem = timeoutObj;
            }
    
            timeItem.called++;
    
            //запусе интервала в случае вызова сверх лимита
            if(timeItem.called >= timeItem.maxCall) {
              timeItem.timeoutId = setTimeout(() => {
                if (callback) callback();
                clearTimeout(timeItem.timeoutId); 
                this._timeouts = this._timeouts.filter(item => item.name !== name);
              }, time);
            }
          },
        
          timeoutIsEnd(name) {
              const timeout = this._timeouts.find(item => (item.name === name && item.timeoutId));
              if (timeout) return false;
              return true;
          },
        
          //таймаутры
          _timeouts: []
    }
}

//дни
function TextDayFormat(num){
    //проверка данных
    if(isNaN(num)) throw new Error('Неверный формат дней');

    const days = Number(num);

    //по умолчанию
    let textDayFormat = '';

    if (days.toString().length > 1 && days.toString().slice(-2).charAt(0) === '1') {
        // Для чисел, заканчивающихся на 11-19
        textDayFormat = `${days} Дней`;
      } else if (days % 10 >= 5 || days % 10 === 0) {
        // Для чисел, заканчивающихся на 5-9 или 0
        textDayFormat = `${days} Дней`;
      } else if (days % 10 >= 2 && days % 10 <= 4) {
        // Для чисел, заканчивающихся на 2-4
        textDayFormat = `${days} Дня`;
      } else {
        // Для чисел, заканчивающихся на 1
        textDayFormat = `${days} День`;
      }
    
      return textDayFormat;
}

function ValidateMarkdown(text) {
    // Стек для отслеживания открытых символов форматирования
    const stack = [];
    
    // Определим парные символы
    const markdownSymbols = ['*', '_', '`', '[', ']'];
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // Проверяем, если перед символом стоит один /
        if (i > 0 && text[i - 1] === '\\') {
            continue;
        }
        
        // Проверка на начало форматирования
        if (markdownSymbols.includes(char)) {
            if (char === '[') {
                // Найдем закрывающую скобку ] и открывающую скобку (
                let closingBracket = text.indexOf(']', i);
                let openingParen = text.indexOf('(', closingBracket);
                let closingParen = text.indexOf(')', openingParen);

                // Проверяем наличие закрывающей скобки, открывающей и закрывающей круглой скобки
                if (closingBracket === -1 || openingParen === -1 || closingParen === -1) {
                    return "Ошибка: Открытая или незакрытая скобка не имеет пару или указано пустое значение внутри скобок";
                }
                
                // Проверка, что внутри квадратных скобок есть контент
                let linkText = text.slice(i + 1, closingBracket).trim();
                if (!linkText) {
                    return "Ошибка: Ссылка не содержит текста между []";
                }

                // Проверка, что внутри круглых скобок есть URL или тип ссылки
                let linkUrl = text.slice(openingParen + 1, closingParen).trim();
                if (!linkUrl) {
                    return ("Ошибка: Ссылка не содержит URL между ()");
                }

                // Перемещаем индекс на конец ссылки
                i = closingParen;
            } else {
                if (stack.length && stack[stack.length - 1] === char) {
                    // Если символ закрывает форматирование, удаляем его из стека
                    stack.pop();
                } else {
                    // Иначе добавляем символ в стек как открывающий
                    stack.push(char);
                }
            }
        }
    }
    
    // Если в конце стек не пуст, значит есть незакрытые символы
    if (stack.length !== 0) {
        return "Ошибка: Незакрытые символы форматирования";
    }

    return "";
}

//создание основных опцией
function CreateButtons(keyboard, vertial = true, parseMarkdown = true) {
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

// Ведение логов
function WriteInLogFile(messageOrError){

    // Информация для лога
    const time = new Time().toFormattedString()
    const isError = (messageOrError instanceof Error);
    let logClause = '', detailClause = '', messageLog = '';

    if(isError){
        logClause = ` [ERROR]: ${messageOrError.message}`;
        detailClause = messageOrError.stack ? `\n[DETAIL]: ${messageOrError.stack}` : '';
    }
    else{
        logClause = ` [INFO]: ${messageOrError}`;
    }

    // Сообщение для лога
    messageLog = `[${time}]${logClause}${detailClause}\n`;

    // Вывод в консоль
    console.log(messageLog);

    try{
        fs.appendFileSync('logs.txt', messageLog + '\n');
 
    }catch(err) {
        console.error(`Не удалось добавить лог: '${messageLog}'`, err);
    }
}

module.exports = {Time, RandCode, WriteInLogFile, CreateState, TextDayFormat, CreateButtons, ValidateMarkdown};
