function validateMarkdown(text) {
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

module.exports = validateMarkdown;