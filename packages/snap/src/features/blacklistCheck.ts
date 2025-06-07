import { heading, row, text, divider, Component } from '@metamask/snaps-sdk';

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

function getRiskLevelText(riskLevel: number): string {
	switch (riskLevel) {
		case 0:
			return 'Safe';
		case 1:
			return 'Low';
		case 2:
			return 'Medium';
		case 3:
			return 'Medium';
		case 4:
			return 'High';
		case 5:
			return 'Critical';
		default:
			return 'Unknown';
	}
}

function getRiskLevelColor(riskLevel: number): string {
	switch (riskLevel) {
		case 0:
			return '🟢';
		case 1:
			return '🟢';
		case 2:
			return '🟡';
		case 3:
			return '🟠';
		case 4:
			return '🔴';
		case 5:
			return '🔴';
		default:
			return '⚪';
	}
}

export async function callDomainSecurity(
	transactionUrl?: any,
	apiKey?: any,
): Promise<Component[] | null> {
	if (!transactionUrl) {
		return null;
	}

	const requestBody = {
		url: transactionUrl,
	};

	try {
		const response = await fetch(
			'https://service.hashdit.io/v2/hashdit/domain-security',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-Key': apiKey, //TODO
				},
				body: JSON.stringify(requestBody),
			},
		);

		const resp = (await response.json()) as DomainSecurityResponse;
		console.log('callDomainSecurity', resp);

		if (resp.code === '0' && resp.status === 'ok' && resp.data.has_result) {
			const riskLevel = resp.data.risk_level;
			const riskLevelText = getRiskLevelText(riskLevel);
			const riskLevelColor = getRiskLevelColor(riskLevel);

			const contentArray: Component[] = [
				heading('Website Security Checkerr'),
				row('Website', text(transactionUrl)),
				row('Risk Level', text(`${riskLevelColor} ${riskLevelText}`)),
			];

			// Add appropriate message based on risk level
			if (riskLevel === 0) {
				contentArray.push(
					text(
						'This website appears to be safe based on our security analysis.',
					),
				);
			} else {
				contentArray.push(
					text(
						'Please exercise caution when interacting with this website.',
					),
				);
			}

			contentArray.push(divider());
			return contentArray;
		}
	} catch (error) {
		console.error('Domain security check failed:', error);
	}
	return null;
}
