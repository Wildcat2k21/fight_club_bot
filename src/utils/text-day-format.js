//дни
function textDayFormat(num){
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

module.exports = textDayFormat;