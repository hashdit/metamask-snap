import { keccak256 } from 'js-sha3';
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
			return 'Medium';
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
			return '🟠';
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