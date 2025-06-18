import { Heading, Row, Text, Divider, Box, Value, Section } from '@metamask/snaps-sdk/jsx';
import { getRiskLevelText, getRiskLevelColor } from '../utils/utilFunctions';

type DomainSecurityResponse = {
	code: string;
	status: string;
	data: {
		has_result: boolean;
		polling_interval: number;
		request_id: string;
		risk_detail: any[];
		risk_level: number;
	};
};

export async function callDomainSecurity(transactionUrl?: any, apiKey?: any): Promise<[JSX.Element | null, number]> {
	if (!transactionUrl) {
		return [null, 0];
	}

	const requestBody = {
		url: transactionUrl,
	};

	try {
		const response = await fetch('https://service.hashdit.io/v2/hashdit/domain-security', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': apiKey,
			},
			body: JSON.stringify(requestBody),
		});

		const resp = (await response.json()) as DomainSecurityResponse;
		console.log('callDomainSecurity', resp);

		if (resp.code === '0' && resp.status === 'ok' && resp.data.has_result) {
			const riskLevel = resp.data.risk_level;
			const riskLevelText = getRiskLevelText(riskLevel);
			const riskLevelColor = getRiskLevelColor(riskLevel);
			const riskVariant = riskLevel >= 4 ? 'critical' : riskLevel === 3 ? 'warning' : 'default';

			return [
				<Box>
					<Heading>Website Security Check</Heading>
					<Section>
						<Row label="Risk Level" variant={riskVariant}>
							<Value value={`${riskLevelColor} ${riskLevelText}`} extra="" />
						</Row>
						<Row label="Website">
							<Value value={`${transactionUrl}`} extra="" />
						</Row>
						{riskLevel === 0 ? (
							<Text color="muted">Based on our security analysis, this website shows no apparent security concerns.</Text>
						) : (
							<Text color="muted">Please exercise caution when interacting with this website.</Text>
						)}
					</Section>
				</Box>,
				riskLevel,
			];
		}
	} catch (error) {
		console.error('Domain security check failed:', error);
	}
	return [null, 0];
}
