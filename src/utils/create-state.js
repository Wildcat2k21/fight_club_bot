//создание состояния
function createState(userData, bot){
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

module.exports = createState;