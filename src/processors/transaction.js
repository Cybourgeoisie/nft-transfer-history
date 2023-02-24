import {
	getErc721Logs,
	getTransactionData,
	getTransactionTrace,
	getErc20Transfers,
	getErc721Transfers,
	getErc1155Transfers,
	collectInternalTransfersFromTrace
} from '../util/index.js';

// In-memory cache to prevent duplicate work
const transactionTransfers = {};

// Keep track of events per token
const eventsByToken = {};

export async function getErc721TransactionHistory(cfg = {}) {
	const erc721Logs = await getErc721Logs(cfg);
	const erc721Transfers = getErc721Transfers(erc721Logs);

	// Bucket all of the tokens into their transactions
	// Return an object keyed by the ERC-721 token
	for (let record of erc721Transfers) {
		let tokenId = record.tokenId;

		if (!eventsByToken.hasOwnProperty(tokenId)) {
			eventsByToken[tokenId] = [];
		}

		// Retrieve the transaction data for transfers
		if (!transactionTransfers.hasOwnProperty(record.txHash)) {
			transactionTransfers[record.txHash] = await getTransactionTransfers(record.txHash);
		}

		// Store record
		eventsByToken[tokenId].push({
			blockNumber : record.blockNumber,
			txHash : record.txHash,
			from : record.from,
			to : record.to,
			transfers: transactionTransfers[record.txHash]
		});
	}

	return eventsByToken;
}

/**
 * Analyze all logs, events, and calltrace to see if:
 * 0. any ETH was transferred
 * 1. any ERC-20 tokens were transferred
 * 2. any ERC-721 or ERC-1155 tokens were transferred or burned
 * 3. any ERC-721s that were transferred
 **/
export async function getTransactionTransfers(txHash) {
	// Get tx & tx receipt
	const tx = await getTransactionData(txHash);

	// Get the logs for the receipt
	let logs = tx.logs;

	// Track all transfers
	let transfers = [];

	// If ETH was sent in, then trace the transfers
	if (tx.value > 0) {
		// Get the calltrace
		let traces = await getTransactionTrace(txHash);

		transfers.push(
			{
				type: "ether",
				value : tx.value.toString()
			},
			...collectInternalTransfersFromTrace(traces)
		);
	}

	// Trace any ERC-20 or ERC-1155 transfers
	transfers.push(
		...getErc20Transfers(logs),
		...getErc1155Transfers(logs)
	);

	return transfers;
}
