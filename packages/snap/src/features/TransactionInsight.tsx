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
import {
	Box,
	Heading,
	Text,
	Divider,
	Row,
	Address,
	Section,
	Value,
} from '@metamask/snaps-sdk/jsx';

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
	const overallRisk = resp.overall_risk;
	const riskDetails = resp.risk_details || [];

	let riskLevelText = 'Unknown';
	let riskLevelColor = '❔';
	let riskVariant: 'default' | 'critical' | 'warning' = 'default';

	if (overallRisk === 5) {
		riskLevelText = 'Critical';
		riskLevelColor = '🚫';
		riskVariant = 'critical';
	} else if (overallRisk === 4) {
		riskLevelText = 'High';
		riskLevelColor = '🚫';
		riskVariant = 'critical';
	} else if (overallRisk === 3) {
		riskLevelText = 'Medium';
		riskLevelColor = '🟠';
		riskVariant = 'warning';
	} else if (overallRisk >= 1) {
		riskLevelText = 'Low';
		riskLevelColor = '🟢';
		riskVariant = 'default';
	} else if (overallRisk === 0) {
		riskLevelText = 'Safe';
		riskLevelColor = '✅';
		riskVariant = 'default';
	}

	return (
		<Box>
			<Heading>Transaction Security Analysis</Heading>

			<Section>
				<Row label="Overall Risk" variant={riskVariant}>
					<Value
						value={`${riskLevelColor} ${riskLevelText}`}
						extra=""
					/>
				</Row>

				{riskDetails.length > 0 ? (
					<Box>
						<Divider />
						{riskDetails.map((detail: any, idx: number) => {
							const detailRiskText = getRiskLevelText(
								detail.risk,
							);
							const detailRiskColor = getRiskLevelColor(
								detail.risk,
							);
							const formattedRiskName = formatRiskName(
								detail.name || 'Unknown',
							);
							const detailVariant:
								| 'default'
								| 'critical'
								| 'warning' =
								detail.risk >= 4
									? 'critical'
									: detail.risk === 3
										? 'warning'
										: 'default';

							return (
								<Box key={`risk-detail-${idx}`}>
									<Heading>
										Risk Detail: {formattedRiskName}
									</Heading>

									<Row
										label="Risk Level"
										variant={detailVariant}
									>
										<Value
											value={`${detailRiskColor} ${detailRiskText}`}
											extra=""
										/>
									</Row>

									{detail.value_type === 'address' &&
										detail.value && (
											<Row label="Address">
												<Address
													address={detail.value}
												/>
											</Row>
										)}

									{detail.value_type !== 'address' &&
										detail.value && (
											<Row label="Value">
												<Value
													value={detail.value}
													extra=""
												/>
											</Row>
										)}

									{detail.description && (
										<Text color="muted">
											{detail.description.replace(
												/\\n/g,
												' ',
											)}
										</Text>
									)}

									<Divider />
								</Box>
							);
						})}
					</Box>
				) : (
					<Box>
						<Divider />
						{overallRisk === 5 && (
							<Row label="Warning" variant="critical">
								<Value
									value="🚨 CRITICAL WARNING: This transaction has been flagged as extremely dangerous. It may result in complete loss of funds. REJECT immediately!"
									extra=""
								/>
							</Row>
						)}
						{overallRisk === 4 && (
							<Row label="Warning" variant="critical">
								<Value
									value="⚠️ HIGH RISK: This transaction has significant security concerns. Please review carefully before proceeding."
									extra=""
								/>
							</Row>
						)}
						{overallRisk === 3 && (
							<Row label="Warning" variant="warning">
								<Value
									value="⚠️ MEDIUM RISK: This transaction has some security concerns. Please proceed with caution."
									extra=""
								/>
							</Row>
						)}
						{overallRisk >= 1 && overallRisk < 3 && (
							<Row label="Warning" variant="default">
								<Value
									value="🟢 LOW RISK: This transaction appears to be safe based on our security analysis."
									extra=""
								/>
							</Row>
						)}
						{overallRisk === 0 && (
							<Row label="Info" variant="default">
								<Value
									value="✅ This transaction appears to be safe based on our security analysis."
									extra=""
								/>
							</Row>
						)}
						<Divider />
					</Box>
				)}
			</Section>
		</Box>
	);
}

function formatRiskName(name: string): string {
	return name
		.replace(/_/g, ' ') // Replace underscores with spaces
		.replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
}
