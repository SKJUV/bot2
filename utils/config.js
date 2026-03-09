// utils/config.js — Configuration runtime modifiable en direct

const runtimeConfig = {
    assistantMode: process.env.ASSISTANT_MODE !== 'false', // true par défaut
    autoViewOnce: process.env.AUTO_VIEWONCE !== 'false',   // true par défaut
};

module.exports = {
    get(key) { return runtimeConfig[key]; },
    set(key, value) { runtimeConfig[key] = value; },
    getAll() { return { ...runtimeConfig }; },
};
