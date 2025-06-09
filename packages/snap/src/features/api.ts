/* eslint-disable */
import { v4 as uuidv4 } from 'uuid';
import hmacSHA256 from 'crypto-js/hmac-sha256';
import encHex from 'crypto-js/enc-hex';
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
import { determineUrlRiskInfo, chainIdHexToNumber } from './utils';




// export async function getHashDitResponse(
// 	businessName: string,
// 	persistedUserData: any,
// 	transactionUrl?: any,
// 	transaction?: any,
// 	chainId?: string,
// 	signatureInsightAddress?: string,
// ) {
// 	const trace_id = uuidv4();

// 	// Formatting chain-id to match api formatting
// 	let chain: string;
// 	switch (chainId) {
// 		case '0x1':
// 			chain = '1';
// 			break;
// 		case '0x38':
// 			chain = '56';
// 			break;
// 		default:
// 			chain = '56';
// 	}

// 	let postBody: any = {};
// 	if (businessName == 'hashdit_snap_tx_api_url_detection') {
// 		postBody.url = transactionUrl;
// 	} else if (businessName == 'hashdit_snap_tx_api_transaction_request') {
// 		//console.log('hashdit_snap_tx_api_transaction_request');
// 		postBody.address = transaction.to;
// 		postBody.chain_id = chain;
// 		postBody.trace_id = trace_id;
// 		postBody.transaction = JSON.stringify(transaction);
// 		postBody.url = transactionUrl;
// 	}
// 	let appId: string;
// 	let appSecret: string;

// 	const timestamp = Date.now();
// 	const nonce = uuidv4().replace(/-/g, '');

// 	const url = new URL(
// 		'https://api.hashdit.io/security-api/public/chain/v1/web3/detect',
// 	);

// 	let dataToSign: string;
// 	appId = persistedUserData.userAddress;
// 	appSecret = persistedUserData.publicKey;

// 	// Other regular business names
// 	url.searchParams.append('business', businessName);

// 	const query = url.search.substring(1);
// 	dataToSign = `${appId};${timestamp};${nonce};POST;/security-api/public/chain/v1/web3/detect;${query};${JSON.stringify(
// 		postBody,
// 	)}`;

// 	const signature = hmacSHA256(dataToSign, appSecret);
// 	const signatureFinal = encHex.stringify(signature);

// 	const response = await customFetch(
// 		url,
// 		postBody,
// 		appId,
// 		timestamp,
// 		nonce,
// 		signatureFinal,
// 	);
// 	return formatResponse(response, businessName);
// }

// // Format the HashDit API response to get the important risk details
// function formatResponse(resp: any, businessName: string) {
// 	let responseData: any = {
// 		overall_risk: -1,
// 		overall_risk_title: 'Unknown',
// 		overall_risk_detail: 'No details',
// 		url_risk_level: 'Unknown',
// 		url_risk_detail: 'Unknown',
// 		function_name: '',
// 		function_param1: '',
// 		function_param2: '',
// 		transaction_risk_detail: 'None found',
// 	};

// 	// URL Screening, checks the risk level of the website / url that initiated the transaction
// 	if (businessName == 'hashdit_snap_tx_api_url_detection') {
// 		const [url_risk_level, url_risk_detail] = determineUrlRiskInfo(
// 			resp.risk_level,
// 		);
// 		responseData.url_risk_level = url_risk_level;
// 		responseData.url_risk_detail = url_risk_detail;

// 		// Transaction Screening, checks transaction data.
// 	} else if (businessName == 'hashdit_snap_tx_api_transaction_request') {
// 		if (resp.detection_result != null) {
// 			const detectionResults = resp.detection_result.risks;
// 			responseData.overall_risk = detectionResults.risk_level;

// 			// Get function name and params - catch if none returned
// 			try {
// 				const paramsCopy = [...resp.detection_result.params];

// 				responseData.function_name =
// 					resp.detection_result.function_name;
// 				responseData.function_params = paramsCopy;
// 			} catch {
// 				//console.log('No params');
// 			}

// 			// Get most risky transaction risk detail - catch if none returned
// 			try {
// 				const transactionData = [...detectionResults.transaction];
// 				responseData.transaction_risk_detail =
// 					transactionData[0].risk_detail;
// 			} catch {
// 				//console.log('No transaction data');
// 			}
// 		}
// 	}

// 	return responseData;
// }

// async function customFetch(
// 	url: URL,
// 	postBody: any,
// 	appId: string,
// 	timestamp: number,
// 	nonce: any,
// 	signatureFinal: any,
// ) {
// 	const response = await fetch(url, {
// 		method: 'POST',
// 		mode: 'cors',
// 		cache: 'no-cache',
// 		credentials: 'same-origin',
// 		headers: {
// 			'Content-Type': 'application/json;charset=UTF-8',
// 			'X-Signature-appid': appId,
// 			'X-Signature-timestamp': timestamp.toString(),
// 			'X-Signature-nonce': nonce,
// 			'X-Signature-signature': signatureFinal,
// 		},
// 		redirect: 'follow',
// 		referrerPolicy: 'no-referrer',
// 		body: JSON.stringify(postBody),
// 	});
// 	// console.log(
// 	// 	appId,
// 	// 	timestamp.toString(),
// 	// 	nonce,
// 	// 	signatureFinal,
// 	// 	JSON.stringify(postBody),
// 	// );

// 	const resp = await response.json();
// 	if (resp.status == 'OK' && resp.data) {
// 		return resp.data;
// 	} else {
// 		//console.log('Fetch api error: ' + resp.errorData);
// 	}
// }
