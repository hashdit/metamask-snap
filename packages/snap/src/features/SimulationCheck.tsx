import { Heading, Text, Copyable, Divider, Address, Row, Box, Section, Value, Tooltip, Card, Image, Icon } from '@metamask/snaps-sdk/jsx';
import { getBlockHeight, toChecksumAddress } from '../utils/utilFunctions';
import { addressPoisoningDetection } from './AddressPoisoning';

export async function callTransactionSimulation(apiKey: any, chainId: any, toAddress: string, fromAddress: string, transactionGasHex: string, transactionValue: string, transactionData: string) {
	const transactionGasNumber = parseInt(transactionGasHex, 16);
	const valueNumber = parseInt(transactionValue, 16).toString();
	const currentBlockHeight = await getBlockHeight();

	const toAddressChecksum = toChecksumAddress(toAddress);
	const fromAddressChecksum = toChecksumAddress(fromAddress);

	try {
		const url = 'https://service.hashdit.io/v2/hashdit/txn-simulation';
		const postBody = {
			chain_id: chainId,
			block_height: currentBlockHeight,
			evm_transactions: [
				{
					from: fromAddressChecksum,
					to: toAddressChecksum,
					value: valueNumber || '0',
					gas_limit: transactionGasNumber,
					data: transactionData || '',
					force: true,
				},
			],
			requested_items: {
				balance_changes: true,
				approve_changes: true,
				ownership_changes: true,
				involved_address_risks: false,
				invocation_tree: false,
			},
		};
		//console.log('simulation postBody', JSON.stringify(postBody, null, 2));

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-KEY': apiKey,
			},
			body: JSON.stringify(postBody),
		});

		if (!response.ok) {
			console.error(`HTTP error! Status: ${response.status}`);
			return createErrorContent('9999999');
		}

		const resp = await response.json();
		// console.log('Simulation Response', JSON.stringify(resp, null, 2));

		if (resp && resp.code === '000000000') {
			const [result] = extractSimulationResult(resp);

			// token_details may not be present in the new format, use empty object as fallback
			const tokenDetails = resp.data?.token_details || {};
			const involved_addresses = resp.data?.involved_addresses || [];
			return createSimulationContent(result.balance_changes, result.approve_changes, tokenDetails, chainId, involved_addresses);
		} else {
			return createErrorContent(resp.code);
		}
	} catch (error) {
		console.error(`Error when calling simulation insight:${error}`, error);
		return createErrorContent('9999999');
	}
}

function extractSimulationResult(response: any) {
	const summaries = response.data.txn_summaries;

	const filtered = summaries.map((txn: any) => {
		const sender = txn.from.toLowerCase();

		let filteredBalanceChanges: any[] = [];
		if (txn.balance_changes && Array.isArray(txn.balance_changes)) {
			// New format: balance_changes is an array
			// Filter to only include balance changes that affect the sender
			for (const balanceChange of txn.balance_changes) {
				if (balanceChange.change_list && Array.isArray(balanceChange.change_list)) {
					// Check if any change in the list affects the sender
					const affectsSender = balanceChange.change_list.some((change: any) => change.address && change.address.toLowerCase() === sender);
					if (affectsSender) {
						filteredBalanceChanges.push(balanceChange);
					}
				}
			}
		}

		let filteredApproveChanges: any[] = [];
		if (txn.approve_changes && Array.isArray(txn.approve_changes)) {
			// approve_changes is now an array
			filteredApproveChanges = txn.approve_changes;
		}

		return {
			from: txn.from,
			balance_changes: filteredBalanceChanges,
			approve_changes: filteredApproveChanges,
		};
	});
	return filtered;
}

async function createSimulationContent(balance_changes: any, approve_changes: any, tokenDetails: any, chainNumber: number, involved_addresses: any) {
	const positiveBalanceChanges: JSX.Element[] = [];
	const negativeBalanceChanges: JSX.Element[] = [];
	const approvalChanges: JSX.Element[] = [];
	const addressPoisoningContent: JSX.Element[] = [];
	let simulationRiskLevel = 0;
	let addressPoisoningRiskLevel = 0;

	if (balance_changes) {
		for (const balance_change of balance_changes) {
			if (balance_change && balance_change.change_list && balance_change.change_list.length > 0) {
				// Get token details from the balance_change object itself
				let symbol = balance_change.symbol || 'Unknown Symbol';
				let tokenName = balance_change.tokenName || 'Unknown Token';
				const tokenPriceUSD = balance_change.tokenPriceUSD ? parseFloat(balance_change.tokenPriceUSD) : null;
				const divisor = balance_change.divisor ? parseInt(balance_change.divisor, 10) : 18;

				// Handle native token naming
				if (symbol === 'native_token') {
					if (chainNumber == 1) {
						symbol = 'ETH';
						tokenName = 'Ethereum';
					} else if (chainNumber == 56) {
						symbol = 'BNB';
						tokenName = 'Binance Coin';
					}
				}

				// Iterate through change_list items
				for (const changeItem of balance_change.change_list) {
					if (!changeItem || typeof changeItem !== 'object') continue;

					// Use the new structure: address, amount_change, raw_amount_change, value_usd
					const address = changeItem.address;
					const amountChange = changeItem.amount_change || changeItem.raw_amount_change;

					if (!address || !amountChange) continue;

					const numericValue = parseFloat(String(amountChange));
					if (isNaN(numericValue)) continue;

					const normalizedTokenAmount = Math.abs(numericValue);
					const valueUSD = changeItem.value_usd ? parseFloat(String(changeItem.value_usd)).toFixed(2) : tokenPriceUSD ? (normalizedTokenAmount * tokenPriceUSD).toFixed(2) : 'Unknown';

					const rowContent = (
						<Box key={`balance-${address}-${changeItem.raw_amount_change}`}>
							<Box>
								<Box direction="horizontal">
									<Text>{tokenName}</Text>
									<Text color="muted">{`(${symbol})`}</Text>
								</Box>
								<Box direction="horizontal" alignment="space-between">
									<Text color={numericValue > 0 ? 'success' : 'error'}>{`${numericValue > 0 ? '+' : ''}${normalizedTokenAmount}`}</Text>
									<Text color="muted">{valueUSD !== 'Unknown' ? `$${valueUSD} USD` : ''}</Text>
								</Box>
								<Divider />
							</Box>
						</Box>
					);

					if (numericValue > 0) {
						positiveBalanceChanges.push(rowContent);
					} else {
						negativeBalanceChanges.push(rowContent);
					}
				}
			}
		}
	}

	if (approve_changes && Array.isArray(approve_changes)) {
		for (const approvalChange of approve_changes) {
			if (!approvalChange || typeof approvalChange !== 'object') continue;

			// Get token details from the approvalChange object itself
			const tokenAddress = approvalChange.token_address || '';
			let symbol = approvalChange.symbol || 'Unknown Symbol';
			let tokenName = approvalChange.tokenName || 'Unknown Token';
			const tokenPriceUSD = approvalChange.tokenPriceUSD ? parseFloat(String(approvalChange.tokenPriceUSD)) : null;

			// Handle native token naming
			if (symbol === 'native_token') {
				if (chainNumber == 1) {
					symbol = 'ETH';
					tokenName = 'Ethereum';
				} else if (chainNumber == 56) {
					symbol = 'BNB';
					tokenName = 'Binance Coin';
				}
			}

			// Get approve_list array
			const approveList = approvalChange.approve_list;
			if (!Array.isArray(approveList) || approveList.length === 0) continue;

			for (const approval of approveList) {
				if (!approval || typeof approval !== 'object') continue;

				// Parse approve_amount and format as integer (uint256 has no decimals)
				const approveAmountRaw = approval.approve_amount != null ? parseFloat(String(approval.approve_amount)) : 0;
				const approveAmount = isNaN(approveAmountRaw) ? '0' : approveAmountRaw.toFixed(0);

				// Parse value_usd and format with 2 decimal places
				const valueUSDRaw = approval.value_usd != null ? parseFloat(String(approval.value_usd)) : 0;
				const valueUSD = isNaN(valueUSDRaw) ? '0.00' : valueUSDRaw.toFixed(2);

				const spenderAddress = approval.spender_address || '';
				const approverAddress = approval.approver_address || '';

				if (!spenderAddress || !tokenAddress) continue;

				approvalChanges.push(
					<Box key={`approval-${tokenAddress}-${spenderAddress}`}>
						<Box direction="horizontal">
							<Text>{tokenName}</Text>
							<Text color="muted">{`(${symbol})`}</Text>
						</Box>
						<Row label="Token Address">
							<Address address={tokenAddress as `0x${string}`} />
						</Row>
						<Row label="Approver">
							<Address address={approverAddress as `0x${string}`} />
						</Row>
						<Row label="Spender">
							<Address address={spenderAddress as `0x${string}`} />
						</Row>
						<Row label="Amount">
							<Value value={approveAmount} extra="" />
						</Row>
						<Row label="Value (USD)">
							<Value value={`$${valueUSD}`} extra="" />
						</Row>
					</Box>,
				);
			}
		}
	}

	if (involved_addresses.length > 0) {
		const accounts = (await ethereum.request({
			method: 'eth_accounts',
		})) as string[];
		if (accounts) {
			const [similarityResult, riskLevel] = addressPoisoningDetection(accounts, involved_addresses) as [JSX.Element | null, number];
			if (similarityResult) {
				addressPoisoningContent.push(similarityResult);
			}
			addressPoisoningRiskLevel = riskLevel;
		}
	}

	return [
		addressPoisoningContent.length > 0 ? <Box>{addressPoisoningContent}</Box> : null,
		addressPoisoningRiskLevel,
		<Box>
			{approvalChanges.length > 0 && (
				<Box>
					<Heading>Approval Changes</Heading>
					<Section>{approvalChanges}</Section>
				</Box>
			)}

			{positiveBalanceChanges.length > 0 && (
				<Box>
					<Heading>⬇️ Asset Inflows ⬇️</Heading>
					<Section>{positiveBalanceChanges}</Section>
				</Box>
			)}

			{negativeBalanceChanges.length > 0 && (
				<Box>
					<Heading>⚠️ Asset Outflows ⚠️</Heading>
					<Section>{negativeBalanceChanges}</Section>
				</Box>
			)}

			{positiveBalanceChanges.length === 0 && negativeBalanceChanges.length === 0 && (
				<Section>
					<Text>No balance changes found</Text>
				</Section>
			)}
		</Box>,
		0,
	];
}

function createErrorContent(respCode: any) {
	console.error('Simulation Error Code :', respCode);

	if (respCode == '0040005') {
		return [
			[],
			0,
			<Box>
				<Heading>Transaction Simulation Failed </Heading>
				<Section>
					<Text color="warning">The transaction simulation reverted. This transaction will likely fail.</Text>
				</Section>
			</Box>,
			3,
		];
	}

	if (respCode == '0040006') {
		return [
			[],
			0,
			<Box>
				<Heading>Transaction Simulation Failed</Heading>
				<Section>
					<Text color="warning">The transaction simulation reverted without a reason. This transaction will likely fail.</Text>
				</Section>
			</Box>,
			3,
		];
	} else {
		return [
			[],
			0,
			<Box>
				<Heading>Transaction Simulation Failed</Heading>
				<Section>
					<Text color="warning">The transaction simulation failed with code: {respCode}. Please try again or try reinstalling the extension.</Text>
				</Section>
			</Box>,
			3,
		];
	}
}
