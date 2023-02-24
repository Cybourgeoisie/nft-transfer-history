import dotenv from 'dotenv';
dotenv.config();

import { getErc721TransactionHistory } from './src/index.js';

// For testing
const tokenAddress = process.env.TOKEN_ADDRESS;
const tokenIdsList = [14058]; // [23178,30546,14077,37755,7886,14061,14058];
const fromBlock = 16000525;
const toBlock = 16683889;
const filterFrom = null;
const filterTo = null;

(async () => {
	let history = await getErc721TransactionHistory({
		tokenAddress: tokenAddress,
		fromBlock,
		toBlock,
		filterFrom,
		filterTo,
		filterTokenIds: tokenIdsList
	});

	console.log(history);

	process.exit();
})();
