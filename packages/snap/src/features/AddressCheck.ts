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
import { determineUrlRiskInfo, chainIdHexToNumber } from './utils';
import { getRiskLevelText, getRiskLevelColor } from '../utils/utilFunctions';
import { isEOA } from './utils';

export async function callHashDitAddressSecurityV2(
	chainNumber: string,
	addressToCheck: string,
	apiKey: any,
) {
	console.log('callHashDitAddressSecurityV2', chainNumber, addressToCheck, apiKey);

	const requestBody = [
		{
			chain_id: chainNumber,
			address: addressToCheck,
		},
	];

	try {
		const response = await fetch(
			'https://service.hashdit.io/v2/hashdit/batch-address-security',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': apiKey,
				},
				body: JSON.stringify(requestBody),
			},
		);
		// Check for HTTP errors
		if (!response.ok) {
			console.error(`HTTP error! Status: ${response.status}`);
			return null;
		}

		const resp = await response.json();
		console.log(
			'callHashDitAddressSecurityV2() response:',
			JSON.stringify(resp, null, 2),
		);

		// Check if the response has `code: 0` and `status: "ok"`
		if (resp.code === '0' && resp.status === 'ok') {
			//console.log('Response is valid');
			return parseHashditAddressSecurityV2(resp);
		} else {
			console.error('Unexpected response:', resp);
			return null;
		}
	} catch (error) {
		console.error(
			`Error when checking address: ${addressToCheck} on chain ${chainNumber}:`,
			error,
		);
		return null;
	}
}

function parseHashditAddressSecurityV2(resp: any) {
	// If no response or no data array, show 'Unknown' risk level
	if (!resp || !resp.data || !Array.isArray(resp.data) || resp.data.length === 0) {
		return null;
	}

	// Get the first item from the data array
	const dataItem = resp.data[0];
	
	let risk_level: any = "-1"
	let hasWhitelist = false;
	let hasBlacklist = false;
	let hasRedAlarm = false;

	// Check if risk_detail exists and has entries
	if (dataItem.risk_detail && dataItem.risk_detail.length > 0) {
		hasRedAlarm = dataItem.risk_detail.some(
			(detail: any) => detail.name === 'red_alarm',
		);
		hasWhitelist = dataItem.risk_detail.some(
			(detail: any) => detail.name === 'is_in_wlist',
		);
		hasBlacklist = dataItem.risk_detail.some(
			(detail: any) => detail.name === 'is_in_blist',
		);

		console.log(
            risk_level,
			hasRedAlarm,
			hasWhitelist,
			hasBlacklist,
			'risk_level, hasRedAlarm, hasWhitelist, hasBlacklist',
		);
	}
	risk_level = dataItem.risk_level ?? "-1";
    const riskLevelText = getRiskLevelText(risk_level);
    const riskLevelColor = getRiskLevelColor(risk_level);

	return createContentForAddressSecurityV2(
		riskLevelText,
        riskLevelColor,
		hasWhitelist,
		hasBlacklist,
	);
}

export function createContentForAddressSecurityV2(
	riskLevelText: string,
	riskLevelColor: string,
	hasWhitelist: boolean,
	hasBlacklist: boolean,
) {
	const resultArray: any[] = [];

	// Determine risk message based on flags and risk level
	let riskMessage = '';
	
	if (hasBlacklist) {
		riskMessage = 'The address you\'re interacting with is **BLACKLISTED by HashDit** as unsafe, associated with malicious activities. **Avoid** interacting with it.';
	} else if (hasWhitelist) {
		riskMessage = 'The address is **whitelisted by HashDit**, indicating high community credibility or longevity.';
	} else {
		// Default messages based on risk level
		switch (riskLevelText) {
			case 'Critical':
			case 'High':
				riskMessage = 'This address shows high risk indicators. Exercise extreme caution and verify all transaction details before proceeding.';
				break;
			case 'Medium':
				riskMessage = 'This address shows moderate risk indicators. Please review the transaction carefully before proceeding.';
				break;
			case 'Low':
				riskMessage = 'This address shows minimal risk indicators. Proceed with normal caution.';
				break;
			case 'Safe':
				riskMessage = 'This address appears safe based on our analysis.';
				break;
			case 'Unknown':
				riskMessage = 'Unable to retrieve security information from our API. The address risk could not be determined at this time.';
				break;
			default:
				riskMessage = 'Unable to determine risk level. Proceed with caution.';
		}
	}

	// Only show screening if we have meaningful information
	if (riskLevelText !== 'Unknown' || hasWhitelist || hasBlacklist) {
		resultArray.push(
			heading('Destination Screen'),
			row('Risk Level', text(`${riskLevelColor} ${riskLevelText}`)),
			text(riskMessage),
			divider(),
		);
	}

	return resultArray;
}

export async function callHashDitAddressSecurityV2_SignatureInsight(
	chainNumber: string,
	spenderAddress: string,
	apiKey: any,
) {
	console.log('callHashDitAddressSecurityV2_SignatureInsight', chainNumber, spenderAddress, apiKey);

	const requestBody = [
		{
			chain_id: chainNumber,
			address: spenderAddress,
		},
	];

	try {
		const response = await fetch(
			'https://service.hashdit.io/v2/hashdit/batch-address-security',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': apiKey,
				},
				body: JSON.stringify(requestBody),
			},
		);
		// Check for HTTP errors
		if (!response.ok) {
			console.error(`HTTP error! Status: ${response.status}`);
			return null;
		}

		const resp = await response.json();
		console.log(
			'callHashDitAddressSecurityV2() response:',
			JSON.stringify(resp, null, 2),
		);

		// Check if the response has `code: 0` and `status: "ok"`
		if (resp.code === '0' && resp.status === 'ok') {
			//console.log('Response is valid');
			return parseHashditAddressSecurityV2_SignatureInsight(resp, spenderAddress);
		} else {
			console.error('Unexpected response:', resp);
			return null;
		}
	} catch (error) {
		console.error(
			`Error when checking address: ${addressToCheck} on chain ${chainNumber}:`,
			error,
		);
		return null;
	}
}

function parseHashditAddressSecurityV2_SignatureInsight(resp: any, spenderAddress: string) {
	// If no response or no data array, show 'Unknown' risk level
	if (!resp || !resp.data || !Array.isArray(resp.data) || resp.data.length === 0) {
		return null;
	}

	// Get the first item from the data array
	const dataItem = resp.data[0];
	
	let risk_level: any = "-1"
	let hasWhitelist = false;
	let hasBlacklist = false;
	let hasRedAlarm = false;

	// Check if risk_detail exists and has entries
	if (dataItem.risk_detail && dataItem.risk_detail.length > 0) {
		hasRedAlarm = dataItem.risk_detail.some(
			(detail: any) => detail.name === 'red_alarm',
		);
		hasWhitelist = dataItem.risk_detail.some(
			(detail: any) => detail.name === 'is_in_wlist',
		);
		hasBlacklist = dataItem.risk_detail.some(
			(detail: any) => detail.name === 'is_in_blist',
		);

		console.log(
            risk_level,
			hasRedAlarm,
			hasWhitelist,
			hasBlacklist,
			'risk_level, hasRedAlarm, hasWhitelist, hasBlacklist',
		);
	}
	risk_level = dataItem.risk_level ?? "-1";
    const riskLevelText = getRiskLevelText(risk_level);
    const riskLevelColor = getRiskLevelColor(risk_level);

	return createContentForAddressSecurityV2_SignatureInsight(
		riskLevelText,
        riskLevelColor,
		hasWhitelist,
		hasBlacklist,
		spenderAddress
	);
}

async function createContentForAddressSecurityV2_SignatureInsight(
	riskLevelText: string,
	riskLevelColor: string,
	hasWhitelist: boolean,
	hasBlacklist: boolean,
	spenderAddress: string,
) {
	const contentArray: any[] = [];

	// Check if spender is an EOA first (highest priority)
	const isSpenderEOA = await isEOA(spenderAddress);
	if (isSpenderEOA) {
		contentArray.push(
			heading('Spender Screen'),
			row('Risk Level', text('🚫 Critical Risk 🚫')),
			row('Spender', address(spenderAddress)),
			text(
				'🚨 SCAM WARNING: This approval gives someone direct access to spend your tokens WITHOUT asking permission again. They can drain your current balance AND any future tokens you receive of this type. This is likely a scam - REJECT immediately to protect your funds.',
			),
			divider(),
		);
		return contentArray;
	}

	// Check blacklist/whitelist status
	if (hasBlacklist) {
		contentArray.push(
			heading('Spender Screen'),
			row('Risk Level', text('🚫 Critical Risk 🚫')),
			row('Spender', address(spenderAddress)),
			text(
				'🚨 SCAM WARNING: This approval gives an address **BLACKLISTED** by HashDit direct access to spend your tokens WITHOUT asking permission again. They can drain your current balance AND any future tokens you receive of this type. This is likely a scam - REJECT immediately to protect your funds',
			),
			divider(),
		);
	} else if (hasWhitelist) {
		contentArray.push(
			heading('Spender Screen'),
			row('Risk Level', text('✅ Safe')),
			row('Spender', address(spenderAddress)),
			text(
				'This transaction is trying to approve your tokens to an address whitelisted by HashDit.',
			),
			divider(),
		);
	} else {
		// Default case - neither blacklisted nor whitelisted
		contentArray.push(
			heading('Spender Screen'),
			row('Risk Level', text(`${riskLevelColor} ${riskLevelText}`)),
			row('Spender', address(spenderAddress)),
			text(
				'This spender is neither blacklisted or whitelisted by HashDit, but approving it gives third-party access to your funds. We recommend only approving the exact amount needed.',
			),
			divider(),
		);
	}

	return contentArray;
}
