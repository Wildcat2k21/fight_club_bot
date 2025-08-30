const LOG_FILE = require('../consts/file-paths').LOG_FILE;
const fs = require('fs');
const Time = require('./time');

// Ведение логов
function writeInLogFile(messageOrError){

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
        fs.appendFileSync(LOG_FILE, messageLog + '\n');
 
    }catch(err) {
        console.error(`Не удалось добавить лог: '${messageLog}'`, err);
    }
}

module.exports = writeInLogFile;