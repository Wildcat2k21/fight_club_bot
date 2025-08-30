function escapeMarkdown(text) {
    // Регулярное выражение для поиска символов, требующих экранирования в Markdown
    return text.replace(/([_*[\]()`])/g, '\\$1');
}

module.exports = escapeMarkdown;