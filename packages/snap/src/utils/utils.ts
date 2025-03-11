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


// Called during HashDit Snap installation. Used to authenticate the user with DiTing, and retrieve an API key.
export async function authenticateDiTing(
	userAddress: string,
	signature: string,
) {
	const requestBody = {
		userAddr: userAddress,
		signature: signature,
	};

	const response = await fetch('https://service.hashdit.io/v2/auth', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(requestBody),
	});
	const resp = await response.json();


	return resp;
}

// Called during HashDit Snap installation. Used to authenticate the user with HashDit, and the user's public key.
export async function authenticateHashDit(
	userAddress: string,
	messageSignature: string,
) {

	const timestamp = Date.now();
	const nonce = uuidv4().replace(/-/g, '');

	const response = await fetch(
		'https://api.hashdit.io/security-api/public/chain/v1/web3/signature',
		{
			method: 'POST',
			mode: 'cors',
			cache: 'no-cache',
			credentials: 'same-origin',
			headers: {
				'Content-Type': 'application/json;charset=UTF-8',
				'X-Signature-appid': userAddress,
				'X-Signature-timestamp': timestamp.toString(),
				'X-Signature-nonce': nonce,
				'X-Signature-signature': messageSignature,
			},
			redirect: 'follow',
			referrerPolicy: 'no-referrer',
		},
	);

	const resp = await response.json();
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
		console.log("hashdit_snap_tx_api_transaction_request");
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
	console.log(appId, timestamp.toString(), nonce, signatureFinal,  JSON.stringify(postBody));

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