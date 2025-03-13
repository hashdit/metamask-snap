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
import { getHashDitResponse, callHashDitAddressSecurityV2 } from './api';

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
export async function parseSignature(
	signature: Signature,
	signatureOrigin: any,
) {
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

	return await callHashDitAPIForSignatureInsight(
		primaryType,
		spender,
		signatureOrigin,
	);
}

// Call the HashDit API to retrieve risk levels
async function callHashDitAPIForSignatureInsight(
	primaryType: any,
	spender: any,
	signatureOrigin: any,
) {
	let contentArray: any[] = [];
	let persistedUserData;
	// Retrieve persisted user data
	try {
		persistedUserData = await snap.request({
			method: 'snap_manageState',
			params: { operation: 'get' },
		});
	} catch (error) {
		console.error('Error retrieving persisted user data:', error);
		contentArray = errorContent;
		return contentArray;
	}

	if (persistedUserData !== null) {
		// Set up the URL detection request promise. This is executed for all permit types.
		const urlRequestPromise = getHashDitResponse(
			'hashdit_snap_tx_api_url_detection',
			persistedUserData,
			signatureOrigin,
		);

		// Set up blacklist call on spender if Permit detected
		const blacklistPromises: Array<Promise<any>> = [];
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		const validChainIds = ['0x38', '0x1'];

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
				blacklistPromises.push(
					callHashDitAddressSecurityV2(
						chainIdNumber,
						spender,
						persistedUserData.DitingApiKey,
					),
				);
			}
		}

		// Resolve all promises, including the URL request and blacklist requests concurrently
		const responses = await Promise.all([
			urlRequestPromise,
			...blacklistPromises,
		]);
		return await createContentForSignatureInsight(
			responses,
			spender,
			signatureOrigin,
		);
	} else {
		//todo
	}
}

// Take the API results and create the contentArrays returned to onSignature() function.
async function createContentForSignatureInsight(
	responses: any,
	spender: any,
	signatureOrigin: string,
) {
	// Define variables for responses
	let urlResp, spenderAddressSecurityResult, isSpenderEOA;
	let contentArray: any[] = [];
	urlResp = responses[0];
	spenderAddressSecurityResult = responses[1];

	// Start of Spender Screening array
	contentArray.push(divider(), heading('Spender Screening'));

	// We consider approving to an EOA spender to be a high risk because there are few scenarios where this is needed.
	isSpenderEOA = await isEOA(spender);
	if (isSpenderEOA) {
		contentArray.push(
			row('Risk Level', text('⛔ High Risk ⛔')),
			row('Spender', address(spender)),
			text(
				'This transaction is trying to approve your tokens to an Externally Owned Account (EOA), likely indicating a scam. Approving it will give a third-party direct access to your funds, risking potential loss. It is advised to reject this transaction.',
			),
		);
	} else if (spenderAddressSecurityResult != null) {
		if (spenderAddressSecurityResult == 'blacklist') {
			contentArray.push(
				row('Risk Level', text('⛔ High Risk ⛔')),
				row('Spender', address(spender)),
				text(
					'This transaction is trying to approve your tokens to an address **blacklisted by HashDit**, likely indicating a scam. Approving it will give a third-party direct access to your funds, risking potential loss. It is advised to reject this transaction.',
				),
			);
		} else if (spenderAddressSecurityResult == 'whitelist') {
			contentArray.push(
				row('Risk Level', text('✅ Safe ')),
				row('Spender', address(spender)),
				text(
					'This transaction is trying to approve your tokens to an address whitelisted by HashDit.',
				),
			);
		} else if (spenderAddressSecurityResult == 'unknown') {
			contentArray.push(
				row('Risk Level', text('Low')),
				row('Spender', address(spender)),
				text(
					'This spender is neither blacklisted or whitelisted by HashDit, but approving it gives third-party access to your funds. We recommend only approving the exact amount needed.',
				),
			);
		}
	} else {
		contentArray.push(
			row('Risk Level', text('Low')),
			row('Spender', address(spender)),
			text(
				'This spender is neither blacklisted or whitelisted by HashDit, but approving it gives third-party access to your funds. We recommend only approving the exact amount needed.',
			),
			divider(),
		);
	}

	contentArray.push(
		divider(),
		heading('Website Screening'),
		row('Website', text(signatureOrigin)),
		row('Risk Level', text(urlResp.url_risk_level)),
		text(urlResp.url_risk_detail),
	);

	return contentArray;
}
