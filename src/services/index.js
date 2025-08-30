const newDBconnection = require('./helpers');
const writeInLogFile = require('@utils/logging');
const initTelegramBot = require('./telegram-bot-service');

let services = null;
let initPromise = null;

/**
 * Агрегатор сервисов (service locator), 
 * Инициализирует сервисы
 * @returns { Promise }
 */
const initServices = () => {
    if(!initPromise){
        initPromise = async () => {
            writeInLogFile('Инициализация сервисов...');
            const db = await newDBconnection();
            const states = [];
            const mailingsTimers = [];
            const bot = initTelegramBot();

            services = {
                db,
                states,
                mailingsTimers,
                bot
            };

            writeInLogFile('Сервисы успешно инициализированы!');
        }
    }

    return initPromise();
}

/**
 * sync service locator, позволяет использовать сервисы
 * в импортах, после initServices
 * @returns { Object }
 * @throws { error } если сервисы не инициализированы
 */
const getServices = () => {
    if(!services){
        throw new Error("Сервисы не инициализированы!");
    }

    return services;
}

module.exports = { initServices, getServices };