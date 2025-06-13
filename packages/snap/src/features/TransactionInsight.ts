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
import { getRiskLevelText, getRiskLevelColor } from '../utils/utilFunctions';

export const TransactionInsight = async (
	transaction: any,
	transactionOrigin: any,
	chainNumber: string,
	apiKey: any,
) => {
	const requestBody = {
		from: transaction.from,
		to: transaction.to,
		data: transaction.data || '',
		value: transaction.value || '0x0',
		// dappUrl: transactionOrigin,
		chainId: chainNumber,
	};
	// Better debugging methods for transaction object
	console.log(
	'Transaction Insight Request Body',
		JSON.stringify(requestBody, null, 2),
		apiKey,
	);
	
	try {
		const response = await fetch(
			'https://service.hashdit.io/v2/hashdit/transaction-security',
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
			'TransactionInsight() Response:',
			JSON.stringify(resp, null, 2),
		);

		// Check if the response has required fields
		if (resp && typeof resp.overall_risk === 'number' && resp.chain) {
			return parseTransactionInsight(resp);
		} else {
			console.error('Unexpected response:', resp);
			return null;
		}
	} catch (error) {
		console.error(`Error when calling transaction insight:${error}`, error);
		return null;
	}
};

function parseTransactionInsight(resp: any) {
	const contentArray: any[] = [];

	const overallRisk = resp.overall_risk;
	const riskDetails = resp.risk_details || [];

	// Determine risk level text and color based on overall_risk
	let riskLevelText = 'Unknown';
	let riskLevelColor = '❔';

	if (overallRisk == 5) {
		riskLevelText = 'Critical';
		riskLevelColor = '🚫';
	} else if (overallRisk == 4) {
		riskLevelText = 'High';
		riskLevelColor = '🚫';
	} else if (overallRisk == 3) {
		riskLevelText = 'Medium';
		riskLevelColor = '🟠';
	} else if (overallRisk >= 1) {
		riskLevelText = 'Low';
		riskLevelColor = '🟢';
	} else if (overallRisk == 0) {
		riskLevelText = 'Safe';
		riskLevelColor = '✅';
	}

	// Add main heading and overall risk
	// If overall risk is 4 or higher, make the text bold
	if (overallRisk >= 4) {
		contentArray.push(
			heading('Transaction Security Analysis'),
			row('Overall Risk', text(`${riskLevelColor} **${riskLevelText}**`)),
		);
	} else {
		contentArray.push(
			heading('Transaction Security Analysis'),
			row('Overall Risk', text(`${riskLevelColor} ${riskLevelText}`)),
		);
	}

	// Process each risk detail
	if (riskDetails.length > 0) {
		contentArray.push(divider());

		for (const detail of riskDetails) {
			const detailRiskText = getRiskLevelText(detail.risk);
			const detailRiskColor = getRiskLevelColor(detail.risk);

			// Add risk detail heading
			const formattedRiskName = formatRiskName(detail.name || 'Unknown');

			// If risk level is 4 or higher, make the text bold
			if (detail.risk >= 4) {
				contentArray.push(
					heading(`Risk Detail: ${formattedRiskName}`),
					row(
						'Risk Level',
						text(`${detailRiskColor} **${detailRiskText}**`),
					),
				);
			} else {
				contentArray.push(
					heading(`Risk Detail: ${formattedRiskName}`),
					row(
						'Risk Level',
						text(`${detailRiskColor} ${detailRiskText}`),
					),
				);
			}
			// Add the address if it's an address type
			if (detail.value_type === 'address' && detail.value) {
				contentArray.push(row('Address', address(detail.value)));
			} else if (detail.value) {
				contentArray.push(row('Value', text(detail.value)));
			}

			// Add description
			if (detail.description) {
				const cleanDescription = detail.description.replace(
					/\\n/g,
					' ',
				);
				contentArray.push(text(cleanDescription));
			}

			contentArray.push(divider());
		}
	} else {
		// No specific risk details, add general message based on overall risk
		if (overallRisk == 5) {
			contentArray.push(
				text(
					'🚨 CRITICAL WARNING: This transaction has been flagged as extremely dangerous. It may result in complete loss of funds. REJECT immediately!',
				),
			);
		} else if (overallRisk == 4) {
			contentArray.push(
				text(
					'⚠️ HIGH RISK: This transaction has significant security concerns. Please review carefully before proceeding.',
				),
			);
		} else if (overallRisk == 3) {
			contentArray.push(
				text(
					'⚠️ MEDIUM RISK: This transaction has some security concerns. Please proceed with caution.',
				),
			);
		} else if (overallRisk >= 1) {
			contentArray.push(
				text(
					'LOW RISK: This transaction appears to be safe based on our security analysis.',
				),
			);
		} else {
			contentArray.push(
				text(
					'✅ This transaction appears to be safe based on our security analysis.',
				),
			);
		}
		contentArray.push(divider());
	}
	console.log('TransactionInsight() Content Array:', contentArray);
	return contentArray;
}

function formatRiskName(name: string): string {
	return name
		.replace(/_/g, ' ') // Replace underscores with spaces
		.replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
}
