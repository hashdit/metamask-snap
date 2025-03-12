/* eslint-disable */

export function chainIdHexToNumber(chainId: string): number {
	const chainMap: Record<string, number> = {
		'0x1': 1,
		'0x38': 56,
	};
	return chainMap[chainId] || 56;
}

// Used to determine if an address is a smart contract or an EOA
export async function isEOA(address: any) {
	// The 'eth_getCode' method returns the bytecode of the address.
	// If bytecode is '0x', then it is an EOA. Otherwise, it is a smart contract
	const code = await ethereum.request({
		method: 'eth_getCode',
		params: [address, 'latest'],
	});

	if (code == '0x') {
		return true;
	} else {
		return false;
	}
}

// Determine the risk title and description for each risk level. Used by URL screening.
export function determineUrlRiskInfo(urlRiskLevel: number): string[] {
	if (urlRiskLevel == 0) {
		return [
			'Safe',
			'The website is safe or whitelisted by HashDit, indicating high community credibility or longevity.',
		];
	} else if (urlRiskLevel == 1) {
		return [
			'No Risk',
			'The website appears safe with no obvious risks, but no guarantee of being risk-free. Default risk level.',
		];
	} else if (urlRiskLevel == 2) {
		return [
			'⚠️ Medium ⚠️',
			'The website is reported as risky and blacklisted by HashDit. We suggest rejecting the transaction.',
		];
	} else if (urlRiskLevel == 3) {
		return [
			'⚠️ Medium ⚠️',
			'The website is reported as risky and blacklisted by HashDit. We suggest rejecting the transaction.',
		];
	} else if (urlRiskLevel == 4) {
		return [
			'⛔ High ⛔',
			'The website is highly risky and blacklisted by HashDit. Interaction may lead to loss of funds. We suggest rejecting the transaction.',
		];
	} else if (urlRiskLevel == 5) {
		return [
			'⛔ High ⛔',
			'The website is highly risky and blacklisted by HashDit. Interaction may lead to catastrophic loss of funds. We suggest rejecting the transaction.',
		];
	} else {
		return [
			'Unknown',
			'The risk level of the website is undetermined. Proceed with caution.',
		];
	}
}

//TODO: Separate for more precise descriptions?
export function determineTransactionAndDestinationRiskInfo(riskLevel: number) {
	if (riskLevel >= 4) {
		return [
			'⛔ High ⛔',
			'This transaction is considered high risk. It is advised to reject this transaction.',
		];
	} else if (riskLevel >= 2) {
		return [
			'⚠️ Medium ⚠️',
			'This transaction is considered medium risk. Please review the details of this transaction.',
		];
	} else if (riskLevel >= 0) {
		return [
			'Low',
			'This transaction is considered low risk. Please review the details of this transaction.',
		];
	} else {
		return [
			'Unknown',
			'The risk level of this transaction is unknown. Please proceed with caution.',
		];
	}
}
