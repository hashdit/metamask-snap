/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import hmacSHA256 from 'crypto-js/hmac-sha256';
import encHex from 'crypto-js/enc-hex';
import { CHAINS_INFO } from './chains';
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

export async function authenticateHashDit(persistedUserData: any) {
	const timestamp = Date.now();
	const nonce = uuidv4().replace(/-/g, '');
	const appId = persistedUserData.userAddress;
	const appSecret = persistedUserData.messageSignature;

	const response = await fetch(
		'https://api.hashdit.io/security-api/public/chain/v1/web3/signature',
		{
			method: 'POST',
			mode: 'cors',
			cache: 'no-cache',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8',
				'X-Signature-appid': appId,
				'X-Signature-timestamp': timestamp.toString(),
				'X-Signature-nonce': nonce,
				'X-Signature-signature': appSecret,
			},
			redirect: 'follow',
			referrerPolicy: 'no-referrer',
		},
	);

	const resp = await response.json();
	//console.log('Authenticate Resp', resp);
}

export async function getHashDitResponse(
	businessName: string,
	persistedUserData: any,
	transactionUrl?: any,
	transaction?: any,
	chainId?: string,
	signatureInsightAddress?: string,
) {
	const trace_id = uuidv4();

	// Formatting chain-id to match api formatting
	let chain: string;
	switch (chainId) {
		case '0x1':
			chain = '1';
			break;
		case '0x38':
			chain = '56';
			break;
		default:
			chain = '56';
	}

	let postBody: any = {};
	if (businessName == 'hashdit_snap_tx_api_url_detection') {
		postBody.url = transactionUrl;
	} else if (businessName == 'internal_address_lables_tags') {
		postBody.address = transaction.to;
		postBody.chain_id = chain;
	} else if (businessName == 'hashdit_snap_tx_api_transaction_request') {
		postBody.address = transaction.to;
		postBody.chain_id = chain;
		postBody.trace_id = trace_id;
		postBody.transaction = JSON.stringify(transaction);
		postBody.url = transactionUrl;
	} else if (businessName == 'signature_insight_blacklist') {
		postBody.address = signatureInsightAddress;
		postBody.chain_id = chain;
	}

	let appId: string;
	let appSecret: string;

	const timestamp = Date.now();
	const nonce = uuidv4().replace(/-/g, '');

	const url = new URL(
		'https://api.hashdit.io/security-api/public/chain/v1/web3/detect',
	);

	let dataToSign: string;
	appId = persistedUserData.userAddress;
	appSecret = persistedUserData.publicKey;

	// Handle signature insight blacklist
	if (businessName == 'signature_insight_blacklist') {
		url.searchParams.append('business', 'internal_address_lables_tags');
	}
	// Other regular business names
	else {
		url.searchParams.append('business', businessName);
	}

	const query = url.search.substring(1);
	dataToSign = `${appId};${timestamp};${nonce};POST;/security-api/public/chain/v1/web3/detect;${query};${JSON.stringify(
		postBody,
	)}`;

	const signature = hmacSHA256(dataToSign, appSecret);
	const signatureFinal = encHex.stringify(signature);

	const response = await customFetch(
		url,
		postBody,
		appId,
		timestamp,
		nonce,
		signatureFinal,
	);
	//console.log(response);
	return formatResponse(response, businessName);
}

// Format the HashDit API response to get the important risk details
function formatResponse(resp: any, businessName: string) {
	let responseData: any = {
		overall_risk: -1,
		overall_risk_title: 'Unknown',
		overall_risk_detail: 'No details',
		url_risk_level: 'Unknown',
		url_risk_detail: 'Unknown',
		function_name: '',
		function_param1: '',
		function_param2: '',
		transaction_risk_detail: 'None found',
	};

	// URL Screening, checks the risk level of the website / url that initiated the transaction
	if (businessName == 'hashdit_snap_tx_api_url_detection') {
		const [url_risk_level, url_risk_detail] = determineUrlRiskInfo(
			resp.risk_level,
		);
		responseData.url_risk_level = url_risk_level;
		responseData.url_risk_detail = url_risk_detail;

		// Destination Screening, checks if destination address is in blacklist or whitelist
	} else if (
		businessName == 'internal_address_lables_tags' ||
		businessName == 'signature_insight_blacklist'
	) {
		responseData.overall_risk = resp.risk_level;

		try {
			const black_labels = JSON.parse(resp.black_labels);
			const white_labels = JSON.parse(resp.white_labels);
			const risk_detail_simple = JSON.parse(resp.risk_detail_simple);
			if (Array.isArray(black_labels) && black_labels.length > 0) {
				responseData.transaction_risk_detail =
					'Destination address is in HashDit blacklist';
			} else if (Array.isArray(white_labels) && white_labels.length > 0) {
				responseData.transaction_risk_detail =
					'Destination address is in whitelisted, please still review the transaction details';
			} else if (
				risk_detail_simple.length > 0 &&
				risk_detail_simple[0].hasOwnProperty('value')
			) {
				responseData.transaction_risk_detail =
					risk_detail_simple[0].value;
			}
		} catch {
			//console.log('No black or white labels');
		}

		// Transaction Screening, checks transaction data.
	} else if (businessName == 'hashdit_snap_tx_api_transaction_request') {
		if (resp.detection_result != null) {
			const detectionResults = resp.detection_result.risks;
			responseData.overall_risk = detectionResults.risk_level;

			// Get function name and params - catch if none returned
			try {
				const paramsCopy = [...resp.detection_result.params];

				responseData.function_name =
					resp.detection_result.function_name;
				responseData.function_params = paramsCopy;
			} catch {
				//console.log('No params');
			}

			// Get most risky transaction risk detail - catch if none returned
			try {
				const transactionData = [...detectionResults.transaction];
				responseData.transaction_risk_detail =
					transactionData[0].risk_detail;
			} catch {
				//console.log('No transaction data');
			}
		}
	}

	return responseData;
}

async function customFetch(
	url: URL,
	postBody: any,
	appId: string,
	timestamp: number,
	nonce: any,
	signatureFinal: any,
) {
	const response = await fetch(url, {
		method: 'POST',
		mode: 'cors',
		cache: 'no-cache',
		credentials: 'same-origin',
		headers: {
			'Content-Type': 'application/json;charset=UTF-8',
			'X-Signature-appid': appId,
			'X-Signature-timestamp': timestamp.toString(),
			'X-Signature-nonce': nonce,
			'X-Signature-signature': signatureFinal,
		},
		redirect: 'follow',
		referrerPolicy: 'no-referrer',
		body: JSON.stringify(postBody),
	});

	const resp = await response.json();
	if (resp.status == 'OK' && resp.data) {
		return resp.data;
	} else {
		//console.log('Fetch api error: ' + resp.errorData);
	}
}

// Parse transacting value to decimals to be human-readable
export function parseTransactingValue(transactionValue: any) {
	let valueAsDecimals = 0;
	valueAsDecimals = parseInt(transactionValue, 16);
	valueAsDecimals = valueAsDecimals / 1e18; // Assumes 18 decimal places for native token
	return valueAsDecimals;
}

// Get native token of chain. If not specified, defaults to `Native Tokens`
export function getNativeToken(chainId: any) {
	if (chainId === undefined || chainId === null) {
		return '';
	}
	let nativeToken = CHAINS_INFO[chainId]?.nativeToken;
	if (nativeToken == undefined) {
		return '';
	}
	return nativeToken;
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

// Perform similarity score to detect address poisoning attacks
export function addressPoisoningDetection(
	userAddresses: string[],
	targetAddresses: string[],
) {
	let resultArray: any[] = [];
	let similarityResult = detectSimilarity(userAddresses, targetAddresses);
	if (similarityResult.length > 0) {
		resultArray.push(
			heading('Address Poisoning'),
			text(
				`You are about to interact with an address that appears similar to one of your personal addresses. This could be an attempt to steal your funds. Please verify the addresses before proceeding.`,
			),
		);
		for (var i = 0; i < similarityResult.length; i++) {
			resultArray.push(
				row('Your Address', address(similarityResult[i].userAddress)),
				row(
					'Similar Address',
					address(similarityResult[i].targetAddress),
				),
				row(
					'Risk Level',
					text(`${similarityResult[i].similarityRiskLevel}`),
				),
				divider(),
			);
		}
	}
	return resultArray;
}

/**
 * The function compares the first and last 5 hexadecimals of two Ethereum addresses.
 * It assesses their prefix and postfix similarity and returns a score ranging from 0 (no similarity) to 5 (complete match).
 * Score increments only when both the 1st character of prefix & suffix match the target address.
 * Skip if the addresses are the same.
 */
function detectSimilarity(
	userAddressArray: string[],
	targetAddressArray: string[],
) {
	var similarityScoreResultArray = [];

	for (let userAddress of userAddressArray) {
		for (let targetAddress of targetAddressArray) {
			// Only compare the addresses after the `0x` prefix
			// Set to lowercase for consistency
			const userAddressConvert = userAddress.toLowerCase().substring(2);
			const targetAddressCovert = targetAddress
				.toLowerCase()
				.substring(2);

			// Addresses are identical. Don't need to consider similarity.
			if (userAddressConvert == targetAddressCovert) {
				continue;
			}

			let similarityScore = 0;
			const addressLength = 39;

			// Compare first 5 hex
			for (var i = 0; i < 5; i++) {
				if (
					userAddressConvert[i] == targetAddressCovert[i] &&
					userAddressConvert[addressLength - i] ==
						targetAddressCovert[addressLength - i]
				) {
					similarityScore += 1;
				}
			}

			// If there are more than 3 matching prefix or postfix characters, we send a warning to the user.
			if (similarityScore >= 3) {
				let similarityRiskLevel;
				switch (similarityScore) {
					case 3:
						similarityRiskLevel = '⛔ High ⛔';
						break;
					case 4:
						similarityRiskLevel = '⛔ High ⛔';
						break;
					case 5:
						similarityRiskLevel = '🚫 **Critical** 🚫';
						break;
				}

				similarityScoreResultArray.push({
					userAddress,
					targetAddress,
					similarityRiskLevel,
				});
			}
		}
	}
	return similarityScoreResultArray;
}

// Determine the risk title and description for each risk level. Used by URL screening.
function determineUrlRiskInfo(urlRiskLevel: number): string[] {
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
		token = message.details;
		amount = undefined;
	}
	// Check for PermitSingle
	else if (primaryType === 'PermitSingle' && message.details) {
		spender = message.spender;
		token = message.details.token;
		amount = message.details.amount;
	}
	// Check for PermitForAll
	else if (primaryType === 'PermitForAll') {
		spender = message.operator;
		token = undefined; // Not relevant for PermitForAll
		amount = undefined; // Not relevant for PermitForAll
	}
	// Check for Permit (ERC20/other token)
	else if (primaryType === 'Permit' && message.spender) {
		spender = message.spender;
		amount = message.value;

		if (message.token) {
			token = message.token;
		} else {
			token = null;
		}
	} else {
		//console.log('Not a Permit Signature, returning null');

		return null;
	}

	return await callHashDitAPIForSignatureInsight(
		primaryType,
		spender,
		token,
		signatureOrigin,
	);
}

// Call the HashDit API to retrieve risk levels
async function callHashDitAPIForSignatureInsight(
	primaryType: any,
	spender: any,
	tokenAddress: any,
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
	let urlResp, spenderBlacklistResp, tokenBlacklistResp, isSpenderEOA;
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
				heading('Spender Screening'),
				row('Risk Level', text('⛔ High ⛔')),
				row('Spender', address(spender)),
				text(
					'This transaction’s spender is an Externally Owned Account (EOA), likely indicating a scam. Approving it will give a third-party direct access to your funds, risking potential loss. It is advised to reject this transaction.',
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

	contentArray.push(
		heading('Spender Screening'),
		row('Risk Level', text('Low')),
		row('Spender', address(spender)),
		text(
			'This transaction’s spender is not blacklisted by HashDit. However, approving it will give a third-party direct access to your funds, risking potential loss. Please proceed with caution. Default risk level.',
		),
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
			'This transaction’s spender is not blacklisted by HashDit. However, approving it will give a third-party direct access to your funds, risking potential loss. Please proceed with caution. Default risk level.',
		];
	} else {
		return [
			'Unknown',
			'The risk level of this transaction is unknown. Please proceed with caution.',
		];
	}
}

export async function checkSignatureDatabase(transactionData: string) {
	const functionSelector = transactionData.slice(0, 10);
	const response = await fetch(
		`https://www.4byte.directory/api/v1/signatures/?hex_signature=${functionSelector}`,
	);
	let resultArray: any[] = [];

	if (response.ok) {
		const data = await response.json();

		if (data.count < 0) {
			resultArray.push(
				divider(),
				heading('4Byte Signature Check'),
				row('Risk Level', text('Low')),
				row('Function Signature', text(functionSelector)),
				text(
					`The function signature was found in the [4Byte](https://www.4byte.directory/signatures/?bytes4_signature=${functionSelector}) database. While calling a known function is less risky due to its verifiable behavior, risks remain if the contract is flawed, malicious, or interacts unpredictably.`,
				),
			);
		} else {
			console.log('Function Signature Not Found');
			resultArray.push(
				divider(),
				heading('4Byte Signature Check'),
				row('Risk Level', text("⚠️ Medium ⚠️")),
				row('Function Signature', text(functionSelector)),
				text(
					`The function signature was not found in the [4Byte](https://www.4byte.directory/signatures/?bytes4_signature=${functionSelector}) database. Calling an unknown signature is risky, as it may trigger malicious or unintended behavior, leading to loss of funds or exploits.`,
				),
			);
		}
	} else {
		console.error('Error querying 4byte API:', response.status);
	}
	return resultArray;
}
