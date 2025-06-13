import {
	Heading,
	Text,
	Copyable,
	Divider,
	Address,
	Row,
	Box,
	Section,
	Value,
	Tooltip,
	Card,
	Image,
	Icon,
} from '@metamask/snaps-sdk/jsx';
import { keccak256 } from 'js-sha3';
import { isEOA, chainIdHexToNumber } from './utils';
import { getBlockHeight, toChecksumAddress } from '../utils/utilFunctions';
import { addressPoisoningDetection } from './AddressPoisoning';

export async function callTransactionSimulation(
	apiKey: any,
	chainId: any,
	toAddress: string,
	fromAddress: string,
	transactionGasHex: string,
	transactionValue: string,
	transactionData: string,
) {
	const chainIdNumber = chainIdHexToNumber(chainId);
	const transactionGasNumber = parseInt(transactionGasHex, 16);
	const valueNumber = parseInt(transactionValue, 16).toString();
	const currentBlockHeight = await getBlockHeight();

	const toAddressChecksum = toChecksumAddress(toAddress);
	const fromAddressChecksum = toChecksumAddress(fromAddress);

	try {
		const url = 'https://service.hashdit.io/v2/hashdit/txn-simulation';
		const postBody = {
			chain_id: chainIdNumber,
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
		console.log('simulation postBody', JSON.stringify(postBody, null, 2));

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
			return null;
		}

		const resp = await response.json();
		console.log('Simulation Response', JSON.stringify(resp, null, 2));

		if (resp && resp.code === '000000000') {
			const [result] = extractSimulationResult(resp);
			console.log(
				result.from,
				result.balance_changes,
				result.approve_changes,
			);

			const tokenDetails = resp.data.token_details || {};
			const involved_addresses = resp.data.involved_addresses || [];
			return createSimulationContent(
				result.balance_changes,
				result.approve_changes,
				tokenDetails,
				chainIdNumber,
				involved_addresses,
			);
		} else {
			return createErrorContent(resp);
		}
	} catch (error) {
		console.error(`Error when calling simulation insight:${error}`, error);
		return null;
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

async function createSimulationContent(
	balance_changes: any,
	approve_changes: any,
	tokenDetails: any,
	chainNumber: number,
	involved_addresses: any,
) {
	console.log('APPROVE CHANGES: ', approve_changes);
	const positiveBalanceChanges: JSX.Element[] = [];
	const negativeBalanceChanges: JSX.Element[] = [];
	const approvalChanges: JSX.Element[] = [];
	const addressPoisoningContent: JSX.Element[] = [];

	if (balance_changes) {
		for (const item of balance_changes) {
			for (const [key, value] of Object.entries(item)) {
				console.log('EACH BALANCE CHANGE: ', key, value);

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
				const normalizedTokenAmount =
					numericValue / 10 ** (tokenDetail?.divisor || 18);
				const transferAmountInUSD = tokenDetail?.tokenPriceUSD
					? (
							normalizedTokenAmount * tokenDetail.tokenPriceUSD
						).toFixed(2)
					: 'Unknown';

				const rowContent = (
					<Box>
						<Card
							title={symbol}
							description={tokenName}
							value={`${numericValue > 0 ? '+' : ''}${normalizedTokenAmount}`}
							extra={`${tokenDetail?.tokenPriceUSD ? `($${transferAmountInUSD} USD)` : ''}`}
						/>
						{Object.keys(balance_changes).indexOf(key) !==
							Object.keys(balance_changes).length - 1 && (
							<Divider />
						)}
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
			console.log('APPROVE CHANGES ITEM: ', item);
			for (const [tokenAddress, approvals] of Object.entries(item)) {
				console.log(
					'APPROVE CHANGES EACH VALUE iN ITEM: ',
					tokenAddress,
					approvals,
				);

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
						<Box
							key={`approval-${tokenAddress}-${approval.spender_address}`}
						>
							<Row label="Token">
								<Value
									value={`${tokenName} (${symbol})`}
									extra=""
								/>
							</Row>
							<Row label="Token Address">
								<Address
									address={tokenAddress as `0x${string}`}
								/>
							</Row>
							<Row label="Spender">
								<Address
									address={
										approval.spender_address as `0x${string}`
									}
								/>
							</Row>
							<Row label="Approval Amount">
								<Value
									value={approval.approve_amount.toString()}
									extra=""
								/>
							</Row>
						</Box>,
					);
				}
			}
		}
	}

	if (involved_addresses.length > 0) {
		const accounts = (await ethereum.request({ method: 'eth_accounts' })) as string[];
		console.log('Connected accounts:', accounts);
		if (accounts) {
			const similarityResult = addressPoisoningDetection(
				accounts,
				involved_addresses,
			);
			if (similarityResult != null) {
				addressPoisoningContent.push(similarityResult);
			}
		}
	}

	return (
		<Box>
			{addressPoisoningContent.length > 0 && (
				<Box>
					<Heading>Address Poisoning</Heading>
					<Section>{addressPoisoningContent}</Section>
				</Box>
			)}
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

			{positiveBalanceChanges.length === 0 &&
				negativeBalanceChanges.length === 0 && (
					<Text>No balance changes found</Text>
				)}
		</Box>
	);
}

function createErrorContent(resp: any) {
	console.log('Error Code:', resp.code);

	if (resp.code == '0040005') {
		return (
			<Box>
				<Heading>⚠️ Transaction Simulation Failed ⚠️</Heading>
				<Text>
					The transaction simulation reverted. This transaction will
					likely fail.
				</Text>
			</Box>
		);
	}

	if (resp.code == '0040006') {
		return (
			<Box>
				<Heading>Transaction Simulation Failed</Heading>
				<Text>
					The transaction simulation reverted without a reason. This
					transaction will likely fail.
				</Text>
			</Box>
		);
	}

	console.error('Simulation error code:', resp.code, resp.error_data);
	return null;
}
