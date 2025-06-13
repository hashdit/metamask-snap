/* eslint-disable */
import {
	heading,
	panel,
	text,
	copyable,
	divider,
	address,
	row,
	Signature,
} from '@metamask/snaps-sdk';
import { errorContent } from './content';
import { isEOA, chainIdHexToNumber } from './utils';
import { callHashDitAddressSecurityV2_SignatureInsight } from './AddressCheck';

// Expected structure for EIP712 signature
export interface SignatureParsed {
	from: string;
	data: {
		types: {
			EIP712Domain: Array<{ name: string; type: string }>;
			PermitBatch?: Array<{ name: string; type: string }>;
			PermitDetails?: Array<{ name: string; type: string }>;
			PermitSingle?: Array<{ name: string; type: string }>;
			PermitForAll?: Array<{ name: string; type: string }>;
			Permit?: Array<{ name: string; type: string }>;
		};
		domain: {
			name: string;
			chainId: string;
			verifyingContract: string;
		};
		primaryType: string;
		message: any;
	};
}

// Determine if the signature is a Permit signature.
export async function parseSignature(signature: Signature, apiKey: any) {

	// We consider personal_sign to be safe
	if (signature.signatureMethod == 'personal_sign') {
		return personalSignatureContent();
	}

	let signatureParsed: SignatureParsed;
	let decodedData;

	// Check if signature.data is an object. Exit if data is not an object
	if (typeof signature.data !== 'object') {
		//console.log('Invalid data type for signature.data:', typeof signature.data);
		return null;
	}

	decodedData = signature.data;

	signatureParsed = {
		from: signature.from,
		data: decodedData,
	};

	const { primaryType, message } = signatureParsed.data;
	//console.log('PrimaryType and Message', primaryType, message);

	let spender: string | undefined;
	let token: any;
	let amount: string | undefined;

	// Check for PermitBatch
	if (
		primaryType === 'PermitBatch' &&
		message.details &&
		Array.isArray(message.details)
	) {
		spender = message.spender;
	}
	// Check for PermitSingle
	else if (primaryType === 'PermitSingle' && message.details) {
		spender = message.spender;
	}
	// Check for PermitForAll
	else if (primaryType === 'PermitForAll') {
		spender = message.operator;
	}
	// Check for Permit (ERC20/other token)
	else if (primaryType === 'Permit' && message.spender) {
		spender = message.spender;
	} else {
		//console.log('Not a Permit Signature, returning null');

		return null;
	}
	// console.log(
	// 	'callHashDitAPIForSignatureInsight',
	// 	primaryType,
	// 	spender,
	// 	apiKey,
	// );
	return await callHashDitAPIForSignatureInsight(
		primaryType,
		spender,
		apiKey,
	);
}

// Call the HashDit API to retrieve risk levels
async function callHashDitAPIForSignatureInsight(
	primaryType: any,
	spender: any,
	apiKey: any,
) {
	// Set up blacklist call on spender if Permit detected
	const blacklistPromises: Array<Promise<any>> = [];
	const chainId = await ethereum.request({ method: 'eth_chainId' });
	const validChainIds = ['0x38', '0x1'];

	let addressSecurityContent = null;
	if (validChainIds.includes(chainId)) {
		const permitTypes = [
			'Permit',
			'PermitSingle',
			'PermitForAll',
			'PermitBatch',
		];

		// If the primaryType is one of the permit types, add the blacklist API call
		const chainIdNumber = chainIdHexToNumber(chainId).toString();

		if (permitTypes.includes(primaryType)) {
			addressSecurityContent =
				await callHashDitAddressSecurityV2_SignatureInsight(
					chainIdNumber,
					spender,
					apiKey,
				);
		}
	}

	return addressSecurityContent;
}

function personalSignatureContent() {
	let contentArray: any[] = [];
	contentArray.push(
		heading('Signature Screen'),
		row('Risk Level', text('✅ Safe')),
		text(
			"This signature is trying to confirm you own this address. It's a common way to verify your identity without sharing your private key. This process is generally safe.",
		),
		divider(),
	);
	return contentArray;
}
