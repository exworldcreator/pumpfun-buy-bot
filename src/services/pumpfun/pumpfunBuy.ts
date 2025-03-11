import { 
    Connection, PublicKey, SystemProgram, TransactionInstruction, 
    Keypair, VersionedTransaction, ParsedAccountData, TransactionMessage 
} from '@solana/web3.js';
import { createAssociatedTokenAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import TelegramBot from 'node-telegram-bot-api';
import * as fs from 'fs';
import axios from 'axios';

const connection: Connection = new Connection('https://mainnet.helius-rpc.com/?api-key=3a000b3a-3d3b-4e41-9b30-c75d439068f1', 'confirmed');
const JITO_BUNDLE_ENDPOINTS = [
    'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
    'https://slc.mainnet.block-engine.jito.wtf/api/v1/bundles'
];

function generateAndSaveWallets(): Keypair[] {
    const wallets: Keypair[] = [];
    const filePath = './wallets.txt';
    const WALLET_COUNT = 5; 

    if (!fs.existsSync(filePath)) {
        for (let i = 0; i < WALLET_COUNT; i++) {
            wallets.push(Keypair.generate());
        }
        const privateKeys = wallets.map(wallet => Buffer.from(wallet.secretKey).toString('hex'));
        fs.writeFileSync(filePath, privateKeys.join('\n'), 'utf8');
        console.log('New wallets generated and saved to wallets.txt');
    } else {
        const privateKeys = fs.readFileSync(filePath, 'utf8').trim().split('\n');
        if (privateKeys.length !== WALLET_COUNT) {
            throw new Error(`The wallets.txt file must contain exactly ${WALLET_COUNT} private keys`);
        }
        for (const key of privateKeys) {
            const secretKey = Buffer.from(key, 'hex');
            wallets.push(Keypair.fromSecretKey(secretKey));
        }
        console.log('Wallets loaded from wallets.txt');
    }
    return wallets;
}

const wallets: Keypair[] = generateAndSaveWallets();
const publicKeys: PublicKey[] = wallets.map(wallet => wallet.publicKey);

interface TokenAccountInfo {
    mint: string;
    owner: string;
    tokenAmount: {
        amount: string;
        decimals: number;
        uiAmount: number;
        uiAmountString: string;
    };
}

export async function getWalletsInfo(): Promise<string> {
    try {
        const accountInfos = await connection.getMultipleAccountsInfo(publicKeys);
        if (!accountInfos || accountInfos.length === 0) {
            throw new Error("Failed to retrieve account information");
        }
        const balances = accountInfos.map(info => info?.lamports || 0);

        let response: string = 'Wallet Information:\n\n';

        for (let i = 0; i < wallets.length; i++) { 
            const wallet = wallets[i];
            const pubKey = wallet.publicKey;
            const solBalance: number = balances[i] / 1e9;

            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, { programId: TOKEN_PROGRAM_ID });

            response += `Wallet ${i + 1}:\n`;
            response += `Address: ${pubKey.toBase58()}\n`;
            response += `SOL Balance: ${solBalance.toFixed(6)} SOL\n`;

            if (tokenAccounts.value.length > 0) {
                response += 'SPL Tokens:\n';
                tokenAccounts.value.forEach(account => {
                    const info = (account.account.data as ParsedAccountData).parsed.info as TokenAccountInfo;
                    if (info.tokenAmount.uiAmount > 0) {
                        response += `- ${info.tokenAmount.uiAmount} tokens (${info.mint.slice(0, 8)}...)\n`;
                    }
                });
            }
            response += '\n';
        }
        return response;
    } catch (error) {
        console.error('Error fetching balances:', error);
        throw new Error(`Error retrieving balances: ${(error as Error).message}`);
    }
}

async function generatePumpFunBuyInstruction(
    connection: Connection,
    mintAddress: string,
    userPublicKey: PublicKey,
    payerKeypair: Keypair,
    solAmount: number
): Promise<TransactionInstruction> {
    const pumpFunProgramId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
    const mint = new PublicKey(mintAddress);
    const lamports = Math.floor(solAmount * Math.pow(10, 9));

    const [bondingCurvePublicKey] = await PublicKey.findProgramAddress(
        [Buffer.from("bonding-curve"), mint.toBuffer()],
        pumpFunProgramId
    );

    const associatedBondingCurve = await getAssociatedTokenAddress(mint, bondingCurvePublicKey, true);
    const associatedUser = await getAssociatedTokenAddress(mint, userPublicKey);

    const accountInfo = await connection.getAccountInfo(associatedUser);
    if (!accountInfo) {
        await createAssociatedTokenAccount(connection, payerKeypair, mint, userPublicKey);
    }

    const tokenDecimals = 6;
    const minTokenAmount = BigInt(50 * Math.pow(10, tokenDecimals));

    const keys = [
        { pubkey: new PublicKey("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf"), isSigner: false, isWritable: false },
        { pubkey: new PublicKey("62qc2CNXwrYqQScmEdiZFFAnJR262PxWEuNQtxfafNgV"), isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: bondingCurvePublicKey, isSigner: false, isWritable: true },
        { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
        { pubkey: associatedUser, isSigner: false, isWritable: true },
        { pubkey: userPublicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
        { pubkey: new PublicKey("Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1"), isSigner: false, isWritable: false },
        { pubkey: pumpFunProgramId, isSigner: false, isWritable: false },
    ];

    const instructionPrefix = Buffer.from([0x66, 0x06, 0x3d, 0x12, 0x01, 0xda, 0xeb, 0xea]);
    const tokenAmountBuffer = Buffer.alloc(8);
    tokenAmountBuffer.writeBigUInt64LE(minTokenAmount);
    const lamportsBuffer = Buffer.alloc(8);
    lamportsBuffer.writeBigUInt64LE(BigInt(lamports));
    const instructionData = Buffer.concat([instructionPrefix, tokenAmountBuffer, lamportsBuffer]);

    return new TransactionInstruction({
        programId: pumpFunProgramId,
        keys,
        data: instructionData,
    });
}

export async function buyPumpFunToken(mintAddress: string, chatId: number, bot: TelegramBot): Promise<void> {
    const MIN_SOL_BALANCE = 0.005;
    const TIP_AMOUNT = 5_000_000; 
    try {
        const accountInfos = await connection.getMultipleAccountsInfo(publicKeys);
        if (!accountInfos || accountInfos.length === 0) throw new Error("Failed to retrieve wallet information");

        const instructions: TransactionInstruction[][] = [];
        for (let i = 0; i < wallets.length; i++) {
            const wallet = wallets[i];
            const balance = (accountInfos[i]?.lamports || 0) / 1e9;
            const solToSpend = balance - MIN_SOL_BALANCE - 0.002 - (TIP_AMOUNT / 1e9);

            if (solToSpend <= 0) {
                bot.sendMessage(chatId, `Insufficient SOL on wallet ${wallet.publicKey.toBase58()} (balance: ${balance} SOL)`);
                continue;
            }

            const buyInstruction = await generatePumpFunBuyInstruction(
                connection,
                mintAddress,
                wallet.publicKey,
                wallet,
                solToSpend
            );
            instructions.push([buyInstruction]);
        }

        if (instructions.length === 0) throw new Error("No wallets with sufficient balance for purchase");

        const tipAccount = new PublicKey('HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe');
        const tipInstruction = SystemProgram.transfer({
            fromPubkey: wallets[instructions.length - 1].publicKey,
            toPubkey: tipAccount,
            lamports: TIP_AMOUNT
        });
        instructions[instructions.length - 1].push(tipInstruction);

        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        console.log(`Using blockhash: ${blockhash}`);

        const versionedTxs: VersionedTransaction[] = instructions.map((instrs, index) => {
            const message = new TransactionMessage({
                payerKey: wallets[index].publicKey,
                recentBlockhash: blockhash,
                instructions: instrs,
            }).compileToV0Message();

            const tx = new VersionedTransaction(message);
            tx.sign([wallets[index]]);
            return tx;
        });

        const bundleId = await sendJitoBundle(versionedTxs, chatId, bot);
        bot.sendMessage(chatId, `Bundle sent! ID: ${bundleId}\nCheck: https://explorer.jito.wtf/bundle/${bundleId}`);

        const status = await checkBundleStatus(bundleId, JITO_BUNDLE_ENDPOINTS[0], bot, chatId);
        if (status !== 'Invalid') {
            bot.sendMessage(chatId, `Bundle status: ${status}`);
        }
    } catch (error) {
        bot.sendMessage(chatId, `Error purchasing token: ${(error as Error).message}`);
        console.error(error);
    }
}

async function sendJitoBundle(transactions: VersionedTransaction[], chatId: number, bot: TelegramBot): Promise<string> {
    const bundle = transactions.map(tx => Buffer.from(tx.serialize()).toString('base64'));
    console.log('Base64 transactions for Jito:', bundle);

    for (let i = 0; i < transactions.length; i++) {
        try {
            const simulation = await connection.simulateTransaction(transactions[i]);
            if (simulation.value.err) {
                throw new Error(`Simulation of transaction ${i + 1} failed: ${JSON.stringify(simulation.value.err)}`);
            }
            console.log(`Simulation of transaction ${i + 1} successful:`, simulation.value);
            bot.sendMessage(chatId, `Simulation of transaction ${i + 1} successful`);
        } catch (error) {
            bot.sendMessage(chatId, `Simulation error: ${(error as Error).message}`);
            throw error;
        }
    }

    let lastError: Error | null = null;
    for (const endpoint of JITO_BUNDLE_ENDPOINTS) {
        try {
            console.log(`Sending bundle to ${endpoint}...`);
            bot.sendMessage(chatId, `Attempting to send bundle to ${endpoint}`);
            const response = await axios.post(endpoint, {
                jsonrpc: '2.0',
                id: 1,
                method: 'sendBundle',
                params: [
                    bundle,
                    { encoding: 'base64' }
                ]
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000,
            });

            console.log('Response from Jito:', response.data);
            const bundleId = response.data.result;
            if (!bundleId) throw new Error('No bundle ID returned');
            return bundleId;
        } catch (error) {
            const axiosError = error as any;
            if (axiosError.response) {
                bot.sendMessage(chatId, `Jito error (${endpoint}): ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
                console.error(`Jito error (${endpoint}):`, axiosError.response.data);
                lastError = new Error(`Jito error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
            } else {
                bot.sendMessage(chatId, `Jito error (${endpoint}): ${(error as Error).message}`);
                console.error(`Jito error (${endpoint}):`, error);
                lastError = error as Error;
            }
        }
    }
    throw lastError || new Error("All Jito endpoints are unavailable");
}

async function checkBundleStatus(bundleId: string, endpoint: string, bot: TelegramBot, chatId: number): Promise<string> {
    try {
        const response = await axios.post(`${endpoint.split('/api/v1/bundles')[0]}/api/v1/getInflightBundleStatuses`, {
            jsonrpc: '2.0',
            id: 1,
            method: 'getInflightBundleStatuses',
            params: [[bundleId]]
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 10000,
        });

        const status = response.data.result.value[0]?.status || 'Unknown';
        return status;
    } catch (error) {
        bot.sendMessage(chatId, `Error checking bundle status: ${(error as Error).message}`);
        return 'Error';
    }
}