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
		//console.log('Simulation Response', JSON.stringify(resp, null, 2));

		if (resp && resp.code === '000000000') {
			const [result] = extractSimulationResult(resp);


			const tokenDetails = resp.data.token_details || {};
			const involved_addresses = resp.data.involved_addresses || [];
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
		if (txn.balance_changes) {
			for (const [key, value] of Object.entries(txn.balance_changes)) {
				if (key.toLowerCase() === sender) {
					filteredBalanceChanges.push(value);
				}
			}
		}
		let filteredApproveChanges: any[] = [];
		if (txn.approve_changes) {
			filteredApproveChanges.push(txn.approve_changes);
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
		for (const item of balance_changes) {
			for (const [key, value] of Object.entries(item)) {
				//console.log('EACH BALANCE CHANGE: ', key, value);

				const tokenDetail = tokenDetails[key] || {};
				let symbol = tokenDetail?.symbol || 'Unknown Symbol';
				let tokenName = tokenDetail?.tokenName || 'Unknown Token';

				if (symbol == 'native_token') {
					if (chainNumber == 1) {
						symbol = 'ETH';
						tokenName = 'Ethereum';
					} else if (chainNumber == 56) {
						symbol = 'BNB';
						tokenName = 'Binance Coin';
					}
				}

				const numericValue = Number(value);
				const normalizedTokenAmount = numericValue / 10 ** (tokenDetail?.divisor || 18);
				const transferAmountInUSD = tokenDetail?.tokenPriceUSD ? (normalizedTokenAmount * tokenDetail.tokenPriceUSD).toFixed(2) : 'Unknown';

				const rowContent = (
					<Box>
						<Box>
							<Box direction="horizontal">
								<Text>{tokenName}</Text>
								<Text color="muted">{`(${symbol})`}</Text>
							</Box>
							<Box direction="horizontal" alignment="space-between">
								<Text color={numericValue > 0 ? 'success' : 'error'}>{`${numericValue > 0 ? '+' : ''}${normalizedTokenAmount}`}</Text>
								<Text color="muted">{`${tokenDetail?.tokenPriceUSD ? `$${transferAmountInUSD} USD` : ''}`}</Text>
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

	if (approve_changes) {
		for (const item of approve_changes) {
		
			for (const [tokenAddress, approvals] of Object.entries(item)) {
				//console.log('APPROVE CHANGES EACH VALUE iN ITEM: ', tokenAddress, approvals);

				const tokenDetail = tokenDetails[tokenAddress] || {};
				let symbol = tokenDetail?.symbol || 'Unknown Symbol';
				let tokenName = tokenDetail?.tokenName || 'Unknown Token';
				if (symbol == 'native_token') {
					if (chainNumber == 1) {
						symbol = 'ETH';
						tokenName = 'Ethereum';
					} else if (chainNumber == 56) {
						symbol = 'BNB';
						tokenName = 'Binance Coin';
					}
				}

				const approvalList = approvals as Array<{
					approve_amount: number;
					approver_address: string;
					spender_address: string;
				}>;

				for (const approval of approvalList) {
					approvalChanges.push(
						<Box key={`approval-${tokenAddress}-${approval.spender_address}`}>
							{/* <Row label="Token">
								<Value
									value={tokenName}
									extra={`(${symbol})`}
								/>
							</Row> */}
							<Box direction="horizontal">
								<Text>{tokenName}</Text>
								<Text color="muted">{`(${symbol})`}</Text>
							</Box>
							<Row label="Token Address">
								<Address address={tokenAddress as `0x${string}`} />
							</Row>
							<Row label="Spender">
								<Address address={approval.spender_address as `0x${string}`} />
							</Row>
							<Row label="Amount">
								<Value value={approval.approve_amount.toString()} extra="" />
							</Row>
						</Box>,
					);
				}
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
		addressPoisoningContent.length > 0 ? (
			<Box>{addressPoisoningContent}</Box>
		) : null,
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

			{positiveBalanceChanges.length === 0 && negativeBalanceChanges.length === 0 && <Section><Text>No balance changes found</Text></Section>}
		</Box>
		,0

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
			3
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
			3
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
			3
		];
	}
}
