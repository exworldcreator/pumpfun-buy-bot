require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { buyPumpFunToken, getWalletsInfo } = require('../dist/pumpfunBuy'); 

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
    console.error('TELEGRAM_BOT_TOKEN is not set in .env');
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Hello! Use:\n/wallets - show wallets\n/buy <mintAddress> - buy token');
});

bot.onText(/\/wallets/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const walletInfo = await getWalletsInfo();
        bot.sendMessage(chatId, walletInfo);
    } catch (error) {
        bot.sendMessage(chatId, error.message);
    }
});

bot.onText(/\/buy (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    if (!match) {
        bot.sendMessage(chatId, 'Please provide a mintAddress: /buy <mintAddress>');
        return;
    }
    const mintAddress = match[1];

    try {
        bot.sendMessage(chatId, `Starting token purchase for ${mintAddress} across all wallets...`);
        await buyPumpFunToken(mintAddress, chatId, bot);
    } catch (error) {
        bot.sendMessage(chatId, `Error: Invalid mintAddress or other issue - ${error.message}`);
    }
});

bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

console.log('Bot started...');