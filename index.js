const fs = require('fs');
require('dotenv').config();
const { ethers, JsonRpcProvider, Interface, toBeHex, toBigInt, formatEther } = require('ethers');

const Erc721ABI = JSON.parse(fs.readFileSync(__dirname + '/abi/erc721.json'));
const Erc20ABI = JSON.parse(fs.readFileSync(__dirname + '/abi/erc20.json'));
const Erc1155ABI = JSON.parse(fs.readFileSync(__dirname + '/abi/erc1155.json'));
const Erc20List = JSON.parse(fs.readFileSync(__dirname + '/config/erc20list.json'));

const provider = new JsonRpcProvider(process.env.JSON_RPC_ENDPOINT);


// For testing
const tokenAddress = process.env.TOKEN_ADDRESS;
const tokenIdsList = [23178,30546,14077,37755,7886,14061,14058];
const fromBlock = 16000525;
const toBlock = 16683889;
const filterFrom = null;
const filterTo = null;



const eventsByToken = {};
const transactionTransfers = {};

async function getLogs(cfg = {}) {
	const interface = new Interface(Erc721ABI);

	let filter = {
		address: cfg.tokenAddress,
		topics: [
			ethers.id("Transfer(address,address,uint256)"),
			cfg.filterFrom || null,
			cfg.filterTo || null,
			(cfg.filterTokenIds && Array.isArray(cfg.filterTokenIds)) ? cfg.filterTokenIds.map((v) => toBeHex(v, 32)) : (cfg.filterTokenIds || null)
		],
		fromBlock: cfg.fromBlock,
		toBlock: cfg.toBlock
	};

	let logs = await provider.getLogs(filter);

	// Bucket all of the tokens into their transactions
	for (let log of logs) {
		// Parse event
		const event = interface.parseLog(log);

		// Prep record
		const tokenId = event.args[2].toString();
		if (!eventsByToken.hasOwnProperty(tokenId)) {
			eventsByToken[tokenId] = [];
		}

		// Store record
		eventsByToken[tokenId].push({
			blockNumber : log.blockNumber,
			txHash : log.transactionHash,
			from : event.args[0],
			to : event.args[1]
		});

		if (!transactionTransfers.hasOwnProperty(log.transactionHash)) {
			transactionTransfers[log.transactionHash] = await getTransactionInformation(log.transactionHash);
		}
	}

	console.log(eventsByToken);
}

async function getTransactionInformation(txHash) {
	// Get tx & tx receipt
	const tx = await provider.getTransaction(txHash);
	const receipt = await provider.getTransactionReceipt(txHash);

	/**
	 * Now analyze all of the events to see if:
	 * 0. any ETH was transferred to a recipient
	 * 1. an ERC-20 token was transferred in
	 * 2. any ERC-721 or ERC-1155 tokens were transferred in or burned
	 * 3. all ERC-721s that were transferred out
	 **/

	// Get the logs for the receipt
	let logs = receipt.logs;

	// Track all transfers
	let transfers = [];

	// If ETH was sent in, then trace the transfers
	if (tx.value > 0) {
		// Get the calltrace
		let traces = await provider.send('debug_traceTransaction', [ txHash, {"tracer": "callTracer"} ]);

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

function collectInternalTransfersFromTrace(trace) {
	let transfers = [];

	if (trace.calls) {
		for (call of trace.calls) {
			if (call.value && toBigInt(call.value) > 0) {
				transfers.push(
					{
						type: "ether_internal",
						from: call.from,
						to: call.to,
						value: toBigInt(call.value).toString()
					},
					...collectInternalTransfersFromTrace(call)
				);
			}
		}
	}

	return transfers;
}

function getErc20Transfers(logs) {
	const interface = new Interface(Erc20ABI);

	let transfers = [];
	for (let log of logs) {
		try {
			// Check if this contract is an ERC-20
			const event = interface.parseLog(log);
			if (event) {
				transfers.push({
					type: "erc20",
					from: event.args[0],
					to: event.args[1],
					value: event.args[2],
					tokenAddress: log.address
				});
			}
		} catch (ex) {
			//console.log("not an erc 20 transfer")
		}
	}

	return transfers;
}

function getErc1155Transfers(logs) {
	const interface = new Interface(Erc1155ABI);

	let transfers = [];
	for (let log of logs) {
		try {
			// Check if this contract is an ERC-1155
			const event = interface.parseLog(log);
			if (event) {
				transfers.push({
					type: "erc1155",
					operator: event.args[0],
					from: event.args[1],
					to: event.args[2],
					ids: event.args[3] && event.args[3].map(x => x.toString()).toArray(),
					amounts: event.args[4] && event.args[4].map(x => x.toString()).toArray(),
					tokenAddress: log.address
				});
			}
		} catch (ex) {
			//console.log("not an erc 1155 transfer")
		}
	}

	return transfers;
}


getLogs({
	tokenAddress: tokenAddress,
	fromBlock,
	toBlock,
	filterFrom,
	filterTo,
	filterTokenIds: tokenIdsList
});

