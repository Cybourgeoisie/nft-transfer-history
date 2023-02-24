import { toBigInt } from 'ethers';

export function collectInternalTransfersFromTrace(trace) {
	let transfers = [];

	if (trace && trace.calls) {
		for (const call of trace.calls) {
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