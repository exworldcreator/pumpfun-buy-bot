## Solana PumpFun Token Purchase Bot

This project is a Telegram bot integrated with the Solana blockchain to manage wallets and purchase tokens on the PumpFun platform. It generates or loads Solana wallets, checks their balances, and executes token purchases via Jito bundles.

## Features
- Generates or loads 5 Solana wallets and saves private keys to `wallets.txt`.
- Retrieves wallet balances (SOL and SPL tokens) via the `/wallets` command.
- Purchases PumpFun tokens across multiple wallets using the `/buy <mintAddress>` command.
- Sends transactions as Jito bundles for faster processing on Solana Mainnet.
- Provides real-time feedback via Telegram messages.

## Prerequisites
- Node.js 18+ (with TypeScript support)
- A Telegram bot token (get one from [BotFather](https://t.me/BotFather))
- Access to the Solana Mainnet RPC (e.g., Helius RPC)

## Installation

### Clone the repository:
```bash
git clone https://github.com/exworldcreator/pumpfun-buy-bot.git
cd pumpfun-buy-bot
```

### Install dependencies:
```bash
npm install
```

### Set up environment variables:
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Edit `.env` with your Telegram bot token:
```ini
TELEGRAM_BOT_TOKEN=your_bot_token_here
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

### Compile TypeScript:
```bash
npx tsc
```

## Usage
Run the bot:
```bash
npm start
```
- The bot will start and log `Bot started...` in the console.

### Interact with the bot on Telegram:
- `/start`: Displays a welcome message with available commands.
- `/wallets`: Shows information about the 5 wallets (addresses, SOL balance, and SPL tokens).
- `/buy <mintAddress>`: Initiates a token purchase for the specified PumpFun token mint address.

### Example Commands:
```plaintext
/wallets
/buy 6zR3Q8e8xL8v8eP8v8eP8v8eP8v8eP8v8eP8v8eP8v8ePpump
```

## Project Structure
```
pumpfun-buy-bot/
│
├── src/
│   ├── services/
│   │   ├── pumpfunBuy.ts    # Solana wallet management and token purchase logic
│   └── main.js              # Telegram bot implementation
├── dist/                    # Compiled JavaScript files (after `npx tsc`)
├── .env                     # Environment variables (ignored by Git)
├── .gitignore               # Git ignore file
├── package.json             # Node.js project configuration
└── README.md                # This file
```

## Dependencies
Install the following via `npm install`:
```json
{
  "name": "pumpfun-bot",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node src/main.js",
    "build": "tsc",
    "dev": "ts-node src/services/pumpfun/pumpfunBuy.ts"
  },
  "dependencies": {
    "@solana/spl-token": "^0.4.8",
    "@solana/web3.js": "^1.95.3",
    "axios": "^1.7.7",
    "dotenv": "^16.4.7",
    "node-telegram-bot-api": "^0.66.0"
  },
  "devDependencies": {
    "@types/node": "^22.7.4",
    "@types/node-telegram-bot-api": "^0.64.7",
    "ts-node": "^10.9.2",
    "typescript": "^5.6.2"
  }
}
```

## Configuration
- **Wallets**: The bot generates 5 wallets by default. Private keys are stored in `wallets.txt`. Edit `WALLET_COUNT` in `pumpfunBuy.ts` to change the number.
- **RPC**: The Solana RPC is set to Helius Mainnet. Replace it in `.env` or `pumpfunBuy.ts` if needed.
- **Jito Endpoints**: Hardcoded in `pumpfunBuy.ts`. Modify `JITO_BUNDLE_ENDPOINTS` to use different endpoints.

## Notes
- Ensure your wallets have sufficient SOL (at least 0.007 SOL per wallet) for transactions and Jito tips.
- The bot uses polling for Telegram updates. For production, consider switching to webhooks.
- Wallet private keys are stored in plain text (`wallets.txt`). Secure this file in a production environment.

## Contributing
1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit your changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a Pull Request.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
