const writeInLogFile = require("@utils/logging.js");

//расшифровка команды
function decodeCommand(message) {

    //команда
    let base64command = message.split(/start\s+/g)[1], command = {};

    //проверк команды
    if (base64command) {
        try {
            let commandParts = atob(base64command).split('=');
            command[commandParts[0]] = commandParts[1];
        }
        catch {
            writeInLogFile(`Команда ${base64command} не может быть расшифрована`);
        }
    }

    return command;
}

module.exports = decodeCommand;