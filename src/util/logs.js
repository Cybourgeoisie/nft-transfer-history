import fs from 'fs';
import path from 'path';
import { Interface } from 'ethers';

const Erc20ABI = JSON.parse(fs.readFileSync(path.resolve('src/abi/erc20.json')));
const Erc721ABI = JSON.parse(fs.readFileSync(path.resolve('src/abi/erc721.json')));
const Erc1155ABI = JSON.parse(fs.readFileSync(path.resolve('src/abi/erc1155.json')));

export function getErc20Transfers(logs) {
	if (!logs || !Array.isArray(logs)) {
		return [];
	}

	const _interface = new Interface(Erc20ABI);

	let transfers = [];
	for (let log of logs) {
		try {
			// Check if this contract is an ERC-20
			const event = _interface.parseLog(log);
			if (event) {
				transfers.push({
					type: "erc20",
					blockNumber : log.blockNumber,
					txHash : log.transactionHash,
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

export function getErc721Transfers(logs) {
	if (!logs || !Array.isArray(logs)) {
		return [];
	}

	const _interface = new Interface(Erc721ABI);

	let transfers = [];
	for (let log of logs) {
		try {
			const event = _interface.parseLog(log);
			if (event) {
				transfers.push({
					type: "erc721",
					blockNumber : log.blockNumber,
					txHash : log.transactionHash,
					from : event.args[0],
					to : event.args[1],
					tokenId : event.args[2].toString()
				});
			}
		} catch (ex) {
			//console.log("not an erc 721 transfer")
		}
	}

	return transfers;
}

export function getErc1155Transfers(logs) {
	if (!logs || !Array.isArray(logs)) {
		return [];
	}

	const _interface = new Interface(Erc1155ABI);

	let transfers = [];
	for (let log of logs) {
		try {
			// Check if this contract is an ERC-1155
			const event = _interface.parseLog(log);
			if (event) {
				transfers.push({
					type: "erc1155",
					blockNumber : log.blockNumber,
					txHash : log.transactionHash,
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
