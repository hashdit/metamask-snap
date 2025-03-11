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
		const isDestinationVerifiedResult = await isDestinationUnverified(
			transaction.to,
			chain,
			apiKey,
		);
		// If contract is unverified, return unverified risk
		if (!isDestinationVerifiedResult) {
			resultArray.push(
				divider(),
				heading('Unverified Risk'),
				row('Contract', address(transaction.to)),
				row('Risk Level', text('⛔ High ⛔')),
				text(
					'The contract you are about to interact with is unverified, meaning its source code is not publicly available. This makes it impossible to determine its behavior or intentions, significantly increasing the risk of malicious activity. We strongly recommend rejecting this transaction to protect your assets.',
				),
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
					divider(),
					heading('Unverified Risk'),
					row('Function Signature', text(functionSelector)),
					text(
						'The function you’re calling is not commonly used. Please confirm that the function details are correct, and check that the contract is safe and not harmful before continuing.',
					),
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

// Check if the contract address is unverified
async function isDestinationUnverified(
	contractAddress: string,
	chainId: string,
	apiKey: string,
) {
	if (!contractAddress) return false;

	const requestBody = {
		chain_id: chainId,
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
			return false;
		}

		const { status, data } = await response.json();

		if (status === 'ok' && data) {
			return !(
				data.address_type === 'Contract' &&
				data.verify_status === 'unverified'
			);
		}
	} catch (error) {
		console.error('Fetch error:', error);
	}

	return false;
}
