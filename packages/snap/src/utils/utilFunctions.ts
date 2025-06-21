import { keccak256 } from 'js-sha3';

type Severity = 'danger' | 'info' | 'success' | 'warning';

export function chainIdHexToNumber(chainId: string): number | null {
	const chainMap: Record<string, number> = {
		'0x1': 1,
		'0x38': 56,
	};
	return chainMap[chainId] || null;
}

export function toChecksumAddress(address: string): string {
	// Remove '0x' prefix and convert to lowercase
	address = address.toLowerCase().replace('0x', '');

	// Get the keccak256 hash of the address
	const hash = keccak256(address);

	// Create a check-summed address
	let checksumAddress = '0x';
	for (let i = 0; i < address.length; i++) {
		// Uppercase the address character if the corresponding hash character is greater than 8
		checksumAddress += parseInt(hash[i], 16) >= 8 ? address[i].toUpperCase() : address[i];
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
			return 'No Obvious Risk';
		case 1:
			return 'Caution';
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
			return '🟢';
		case 1:
			return '🟡';
		case 2:
			return '🟡';
		case 3:
			return '🟠';
		case 4:
			return '🔴';
		case 5:
			return '🔴';
		default:
			return '❔';
	}
}

export function getRiskLevelVariant(riskLevel: number): 'default' | 'critical' | 'warning' {
	switch (riskLevel) {
		case 0:
			return 'default';
		case 1:
			return 'default';
		case 2:
			return 'default';
		case 3:
			return 'warning';
		case 4:
			return 'critical';
		case 5:
			return 'critical';
		default:
			return 'default';
	}
}

export function riskLevelToBannerValues(riskLevel: number): [Severity, string, string] {
	switch (riskLevel) {
		case 0:
			return ['success', 'No Obvious Risk', 'This transaction does not appear to pose any significant risk. However, we recommend reviewing all transaction details before proceeding.'];
		case 1:
			return ['info', 'Caution', 'This transaction currently shows no identified security concerns. However, we recommend reviewing all transaction details before proceeding.'];
		case 2:
			return ['warning', 'Low Risk', 'This transaction poses a low risk. We recommend reviewing all transaction details before proceeding.'];
		case 3:
			return ['warning', 'Medium Risk', 'This transaction poses a medium risk. We recommend reviewing all transaction details carefully before proceeding.'];
		case 4:
			return ['danger', 'High Risk', 'This transaction poses a high risk. We strongly recommend rejecting this transaction.'];
		case 5:
			return ['danger', 'Critical Risk', 'This transaction poses a critical risk. We strongly recommend rejecting this transaction.'];
		default:
			return ['info', 'Unknown Risk', 'We could not determine the risk level of this transaction. Please review all transaction details carefully before proceeding.'];
	}
}

export const getRiskTitle = (riskName: string): string => {
	const riskDescriptions: { [key: string]: string } = {
		// Destination Analysis
		malicious_destination_interaction: 'Transaction To Known Malicious Address',
		EOA_destination_interaction: 'Transaction Destination Is An EOA Address',
		new_unverified_contract_interaction: 'Transaction To Recently Created Unverified Contract',
		unverified_contract_interaction: 'Transaction To Unverified Contract',
		new_verified_contract_interaction: 'Transaction To Recently Created Verified Contract',
		low_activity_address_interaction: 'Transaction To Address With Little Transaction History',

		// Function Signature Analysis
		malicious_signature: 'Transaction Calls A Known Malicious Function',
		unknown_signature: 'Transaction Uses Unknown Function Signature',
		custom_function: 'Transaction Calls Custom/Non-Standard Function',

		// Function Parameter Analysis
		blacklisted_address_in_params: 'Function Parameter Contains Blacklisted Address',
		eoa_in_params: 'Function Parameter Contains EOA Address',
		unverified_contract_in_params: 'Function Parameter Contains Unverified Contract',
		low_activity_address_in_params: 'Function Parameter Contains Low-Activity Address',

		// ERC20 Transfer Analysis
		malicious_recipient: 'Transferring Tokens To Known Malicious Address',
		invalid_transfer: 'Could Not Determine Recipient Address For Transfer',
		unverified_contract_recipient: 'Transferring Tokens To Unverified Contract',
		contract_recipient: 'Transferring Tokens To A Contract',
		new_contract_recipient: 'Transferring Tokens To Recently Created Contract',
		low_activity_recipient: 'Transferring Tokens To Low-Activity Address',
		high_portion_transfer: 'Transferring Unusually Large Amount Of Tokens Or Using TransferFrom For Large Portion Of Balance',

		// ERC20 TransferFrom Analysis
		delegation_mismatch: 'TransferFrom Operator Is Not The Recipient',
		contract_source: 'Transferring Tokens From A Contract',

		// ERC20 Approval Analysis
		malicious_spender: 'Approving Tokens To Known Malicious Address',
		invalid_approval: 'Could Not Determine Spender Address For Approval',
		unlimited_EOA_approval: 'Unlimited Token Approval To EOA Address',
		unlimited_unverified_contract_approval: 'Unlimited Token Approval To Unverified Contract',
		unlimited_approval: 'Unlimited Token Approval To Verified Contract',
		EOA_approval: 'Token Approval To EOA Address',
		unverified_contract_approval: 'Token Approval To Unverified Contract',

		// dApp Security Analysis
		dapp_risk: 'The dApp URL Is Flagged As Risky By Threat Intelligence',
	};

	// If the mapping does not exist, reformat the risk name and return it.
	return riskDescriptions[riskName] || formatRiskName(riskName);
};

function formatRiskName(name: string): string {
	return name
		.replace(/_/g, ' ') // Replace underscores with spaces
		.replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
}
