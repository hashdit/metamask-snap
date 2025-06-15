import { keccak256 } from 'js-sha3';

type Severity = "danger" | "info" | "success" | "warning";

export function toChecksumAddress(address: string): string {
	// Remove '0x' prefix and convert to lowercase
	address = address.toLowerCase().replace('0x', '');

	// Get the keccak256 hash of the address
	const hash = keccak256(address);

	// Create a checksummed address
	let checksumAddress = '0x';
	for (let i = 0; i < address.length; i++) {
		// Uppercase the address character if the corresponding hash character is greater than 8
		checksumAddress +=
			parseInt(hash[i], 16) >= 8 ? address[i].toUpperCase() : address[i];
	}

	return checksumAddress;
}

export async function getBlockHeight() {
	try {
		// Use the snap's provider to call the eth_blockNumber method
		const blockNumberHex = (await ethereum.request({
			method: 'eth_blockNumber',
		})) as string;

		// Convert the hex block number to a decimal number
		const blockNumber = parseInt(blockNumberHex, 16);

		//console.log(`Current Block Height: ${blockNumber}`);
		return blockNumber.toString();
	} catch (error) {
		console.error('Error retrieving block height:', error);
		throw error;
	}
}

export function getRiskLevelText(riskLevel: number): string {
	switch (riskLevel) {
		case 0:
			return 'Safe';
		case 1:
			return 'Low';
		case 2:
			return 'Low';
		case 3:
			return 'Medium';
		case 4:
			return 'High';
		case 5:
			return 'Critical';
		default:
			return 'Unknown';
	}
}

export function getRiskLevelColor(riskLevel: number): string {
	switch (riskLevel) {
		case 0:
			return '✅';
		case 1:
			return '🟢';
		case 2:
			return '🟢';
		case 3:
			return '🟠';
		case 4:
			return '🚫';
		case 5:
			return '🚫';
		default:
			return '❔';
	}
}

export function riskLevelToBannerValues(riskLevel: number): [Severity, string, string] {	
	switch (riskLevel) {
		case 0:
			return ['success', 'Safe', 'This transaction appears safe. However, we recommend reviewing all transaction details before proceeding.'];
		case 1:
			return ['info', 'Low Risk', 'This transaction poses a low risk. We recommend reviewing all transaction details before proceeding.'];
		case 2:
			return ['info', 'Low Risk', 'This transaction poses a low risk. We recommend reviewing all transaction details before proceeding.'];
		case 3:
			return ['warning', 'Medium Risk', 'This transaction poses a medium risk. We recommend reviewing all transaction details carefully before proceeding.'];
		case 4:
			return ['danger', 'High Risk', 'This transaction poses a high risk. We strongly recommend rejecting this transaction.'];
		case 5:
			return ['danger', 'Critical Risk', 'This transaction poses a critical risk. We strongly recommend rejecting this transaction immediately.'];
		default:
			return ['info', 'Unknown Risk', 'We could not determine the risk level of this transaction. Please review all transaction details carefully before proceeding.'];
	}
}

