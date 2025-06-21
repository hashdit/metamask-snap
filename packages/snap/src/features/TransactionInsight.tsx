/* eslint-disable */
import { getRiskLevelText, getRiskLevelColor, getRiskLevelVariant } from '../utils/utilFunctions';
import { Box, Heading, Text, Divider, Row, Address, Section, Value } from '@metamask/snaps-sdk/jsx';
import { getRiskTitle } from '../utils/utilFunctions';

export const callTransactionInsight = async (transaction: any, transactionOrigin: any, chainNumber: string, apiKey: any) => {
	const requestBody = {
		from: transaction.from,
		to: transaction.to,
		data: transaction.data || '',
		value: transaction.value || '0x0',
		chainId: chainNumber,
	};
	// Better debugging methods for transaction object
	//console.log('Transaction Insight Request Body', JSON.stringify(requestBody, null, 2), apiKey);

	try {
		const response = await fetch('https://service.hashdit.io/v2/hashdit/transaction-security', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': apiKey,
			},
			body: JSON.stringify(requestBody),
		});
		// Check for HTTP errors
		if (!response.ok) {
			console.error(`HTTP error! Status: ${response.status}`);
			return [null, 0];
		}

		const resp = await response.json();
		//console.log('TransactionInsight() Response:', JSON.stringify(resp, null, 2));

		// Check if the response has required fields
		if (resp && typeof resp.overall_risk === 'number' && resp.chain) {
			return parseTransactionInsight(resp);
		} else {
			console.error('Unexpected response:', resp);
			return [null, 0];
		}
	} catch (error) {
		console.error(`Error when calling transaction insight:${error}`, error);
		return [null, 0];
	}
};

function parseTransactionInsight(resp: any) {
	const overallRisk = resp.overall_risk;
	const riskDetails = resp.risk_details || [];

	return [
		<Box>
			<Heading>Transaction Security Analysis</Heading>

			<Section>
				{riskDetails.length > 0 ? (
					<Box>
						{[...riskDetails]
							.sort((a, b) => b.risk - a.risk)
							.map((detail: any, idx: number) => {
								const riskText = getRiskLevelText(detail.risk);
								const riskColor = getRiskLevelColor(detail.risk);
								const formattedRiskName = getRiskTitle(detail.name || 'Unknown');

								const riskVariant = getRiskLevelVariant(detail.risk);

								return (
									<Box key={`risk-detail-${idx}`}>
										<Heading>{formattedRiskName}</Heading>

										<Row label="Risk Level" variant={riskVariant}>
											<Value value={`${riskColor} ${riskText}`} extra="" />
										</Row>

										{detail.value_type === 'address' && detail.value && (
											<Row label="Address">
												<Address address={detail.value} />
											</Row>
										)}

										{detail.value_type !== 'address' && detail.value && (
											<Row label="Value">
												<Value value={detail.value} extra="" />
											</Row>
										)}

										{detail.description && <Text color="muted">{detail.description.replace(/\\n/g, ' ')}</Text>}

										<Divider />
									</Box>
								);
							})}
					</Box>
				) : (
					<Box>
						{(() => {
							const riskText = getRiskLevelText(overallRisk);
							const riskColor = getRiskLevelColor(overallRisk);
							const riskVariant = getRiskLevelVariant(overallRisk);

							return (
								<Row label="Risk Level" variant={riskVariant}>
									<Value value={`${riskColor} ${riskText}`} extra="" />
								</Row>
							);
						})()}
					</Box>
				)}
			</Section>
		</Box>,
		overallRisk,
	];
}

// function formatRiskName(name: string): string {
// 	return name
// 		.replace(/_/g, ' ') // Replace underscores with spaces
// 		.replace(/\b\w/g, (char) => char.toUpperCase()); // Capitalize first letter of each word
// }
