import { id, JsonRpcProvider, toBeHex } from 'ethers';
import dotenv from 'dotenv';
dotenv.config();

const provider = new JsonRpcProvider(process.env.JSON_RPC_ENDPOINT);

export async function getErc721Logs(cfg = {}) {
	const filter = {
		address: cfg.tokenAddress,
		topics: [
			id("Transfer(address,address,uint256)"),
			cfg.filterFrom || null,
			cfg.filterTo || null,
			(cfg.filterTokenIds && Array.isArray(cfg.filterTokenIds)) ? cfg.filterTokenIds.map((v) => toBeHex(v, 32)) : (cfg.filterTokenIds || null)
		],
		fromBlock: cfg.fromBlock,
		toBlock: cfg.toBlock
	};

	return await provider.getLogs(filter);
}

export async function getTransactionData(txHash) {
	// Get tx & tx receipt
	const tx = await provider.getTransaction(txHash);
	const receipt = await provider.getTransactionReceipt(txHash);

	return {
		...tx,
		...receipt
	};
}

export async function getTransactionTrace(txHash) {
	return await provider.send('debug_traceTransaction', [ txHash, {"tracer": "callTracer"} ]);
}

