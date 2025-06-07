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

// We only support checking if contract is verified on BSC and ETH
const chainMap: Record<string, string> = {
	'0x38': '56',
	'0x1': '1',
};

export async function verifyContractAndFunction(
	transaction: any,
	chainId: string,
	apiKey: string,
) {
	const resultArray = [];

	const chain = chainMap[chainId] || '';

	if (chain) {
		const isDestinationVerifiedResult = await isDestinationVerified(
			transaction.to,
			chain,
			apiKey,
		);
		// If contract is unverified, return unverified risk
		if (!isDestinationVerifiedResult) {
			resultArray.push(
				heading('Unverified Risk'),
				row('Contract', address(transaction.to)),
				row('Risk Level', text('⛔ High ⛔')),
				text(
					'The contract you are about to interact with is unverified, meaning its source code is not publicly available. This makes it impossible to determine its behavior or intentions, significantly increasing the risk of malicious activity. We strongly recommend rejecting this transaction to protect your assets.',
				),
				divider(),
			);

			return resultArray;
		}
	}

	// Contract is verified, continue to check if the function signature is in the 4Byte database
	const functionSelector = transaction.data.slice(0, 10);

	try {
		const response = await fetch(
			`https://www.4byte.directory/api/v1/signatures/?hex_signature=${functionSelector}`,
		);

		if (response.ok) {
			const data = await response.json();
			// 0 results returned by the API, meaning the function signature was not found
			if (data.count == 0) {
				//console.log('Function Signature Not Found');
				resultArray.push(
					heading('Unverified Risk'),
					row('Function Signature', text(functionSelector)),
					text(
						"The function you're calling is not commonly used. Please confirm that the function details are correct, and check that the contract is safe and not harmful before continuing.",
					),
					divider(),
				);
			}
		} else {
			console.error('Error querying 4byte API:', response.status);
		}
	} catch (error) {
		console.error('Fetch error:', error);
	}

	return resultArray;
}

async function isDestinationVerified(
	contractAddress: any,
	chainId: any,
	apiKey: any,
) {
	// Input validation
	if (!contractAddress || !chainId || !apiKey) {
		console.error('Missing required parameter for contract verification');
		return true;
	}

	const requestBody = {
		chainId: chainId,
		address: contractAddress,
	};

	try {
		const response = await fetch(
			'https://service.hashdit.io/v2/hashdit/address-classify',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-API-KEY': apiKey,
				},
				body: JSON.stringify(requestBody),
			},
		);

		if (!response.ok) {
			console.error(
				`API Error: ${response.status} ${response.statusText}`,
			);
			return true;
		}

		const resp = await response.json();

		// Validate response structure
		if (resp.status !== 'ok' || !resp.data || !resp.data.details) {
			console.error('Invalid API response structure');
			return true;
		}

		// Only check verification status if it's a contract
		if (resp.data.address_type === 'Contract') {
			return resp.data.details.is_verified;
		}

		// For non-contract addresses, return true
		return true;
	} catch (error) {
		console.error('Fetch error:', error);
		return true;
	}
}
