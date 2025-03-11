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
import { getHashDitResponse, isEOA } from './utils';

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
	console.log(
		callHashDitAPIForSignatureInsight,
		primaryType,
		spender,
		signatureOrigin,
	);
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

		// Set up additional promises depending on the primaryType
		const blacklistPromises: Array<Promise<any>> = [];
		const chainId = await ethereum.request({ method: 'eth_chainId' });
		if (
			typeof chainId === 'string' &&
			(chainId === '0x38' || chainId === '0x1')
		) {
			if (primaryType === 'Permit' || primaryType === 'PermitSingle') {
				// Call blacklist API on spender and token address
				blacklistPromises.push(
					getHashDitResponse(
						'signature_insight_blacklist',
						persistedUserData,
						null,
						null,
						chainId,
						spender,
					),
				);
			} else if (primaryType === 'PermitForAll') {
				blacklistPromises.push(
					getHashDitResponse(
						'signature_insight_blacklist',
						persistedUserData,
						null,
						null,
						chainId,
						spender,
					),
				);
			} else if (primaryType === 'PermitBatch') {
				blacklistPromises.push(
					getHashDitResponse(
						'signature_insight_blacklist',
						persistedUserData,
						null,
						null,
						chainId,
						spender,
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
	}
}

// Take the API results and create the contentArrays returned to onSignature() function.
async function createContentForSignatureInsight(
	responses: any,
	spender: any,
	signatureOrigin: string,
) {
	// Define variables for responses
	let urlResp, spenderBlacklistResp, isSpenderEOA;
	let contentArray: any[] = [];

	// Assign responses based on primaryType
	urlResp = responses[0];
	spenderBlacklistResp = responses[1];

	// Check if spender is an Externally Owned Address.
	// We consider approving to an EOA spender to be a high risk because there are few scenarios where this is needed.
	isSpenderEOA = await isEOA(spender);
	// If spender is EOA and spender isn't blacklisted
	if (isSpenderEOA) {
		// If the chain is not ETH or BSC, then spenderBlacklistResp will be undefined
		if (
			spenderBlacklistResp == undefined ||
			spenderBlacklistResp.overall_risk <= 2
		) {
			contentArray.push(
				divider(),
				heading('Spender Screening'),
				row('Risk Level', text('⛔ High Risk ⛔')),
				row('Spender', address(spender)),
				text(
					'This transaction is trying to approve your tokens to an Externally Owned Account (EOA), likely indicating a scam. Approving it will give a third-party direct access to your funds, risking potential loss. It is advised to reject this transaction.',
				),
				divider(),
				heading('Website Screening'),
				row('Website', text(signatureOrigin)),
				row('Risk Level', text(urlResp.url_risk_level)),
				text(urlResp.url_risk_detail),
			);
			return contentArray;
		}
	}

	// Supported chain
	if (spenderBlacklistResp != undefined) {
		if (spenderBlacklistResp.overall_risk != -1) {
			// Convert risk level to risk title
			const [riskTitle, riskOverview] = determineSpenderRiskInfo(
				spenderBlacklistResp.overall_risk,
			);
			contentArray.push(
				divider(),
				heading('Spender Screening'),
				row('Risk Level', text(riskTitle)),
				row('Spender', address(spender)),
				text(riskOverview),
				divider(),
				heading('Website Screening'),
				row('Website', text(signatureOrigin)),
				row('Risk Level', text(urlResp.url_risk_level)),
				text(urlResp.url_risk_detail),
			);

			return contentArray;
		}
	}
	// Fallback content value if (not a supported chain and spender is not EOA), or (API return overall_risk level of -1 / unknown)
	const spenderRiskInfo = determineSpenderRiskInfo(0);
	contentArray.push(
		divider(),
		heading('Spender Screening'),
		row('Risk Level', text('Low')),
		row('Spender', address(spender)),
		text(spenderRiskInfo[1]),
		divider(),
		heading('Website Screening'),
		row('Website', text(signatureOrigin)),
		row('Risk Level', text(urlResp.url_risk_level)),
		text(urlResp.url_risk_detail),
	);

	return contentArray;
}

// Determine the risk title and description for each risk level. Used by Signature Insight.
export function determineSpenderRiskInfo(riskLevel: number) {
	if (riskLevel >= 2) {
		return [
			'⛔ High ⛔',
			'This transaction’s spender is **blacklisted** by HashDit, likely indicating a scam. Approving it will give a third-party direct access to your funds, risking potential loss. It is advised to reject this transaction.',
		];
	} else if (riskLevel >= 0) {
		return [
			'Low',
			'This spender is not blacklisted by HashDit, but approving it gives third-party access to your funds, posing a risk. We recommend only approving the exact amount needed.',
		];
	} else {
		return [
			'Unknown',
			'The risk level of this transaction is unknown. Please proceed with caution.',
		];
	}
}
