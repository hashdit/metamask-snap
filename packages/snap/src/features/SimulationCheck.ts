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
import { keccak256 } from 'js-sha3';
import { isEOA, chainIdHexToNumber } from './utils';
import { getBlockHeight, toChecksumAddress } from '../utils/utilFunctions';

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

	// Convert addresses to checksum format

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
		// Make the API call
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
		// Check if the response has required fields
		if (resp && resp.code === '000000000') {
			const [result] = extractSimulationResult(resp);
			console.log(
				result.from,
				result.balance_changes,
				result.approve_changes,
			);

			// Extract token_details from the response
			const tokenDetails = resp.data.token_details || {};

			const simulationContent = createSimulationContent(
				result.balance_changes,
				result.approve_changes,
				tokenDetails,
				chainIdNumber,
			);
			return simulationContent;
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

		// Get all balance changes for the sender, case-insensitive
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

function createSimulationContent(
	balance_changes: any,
	approve_changes: any,
	tokenDetails: any,
	chainNumber: number,
) {
	console.log('APPROVE CHANGES: ', approve_changes);
	const contentArray: any[] = [];
	const positiveBalanceChanges: any[] = [];
	const negativeBalanceChanges: any[] = [];
	const approvalChanges: any[] = [];
	if (balance_changes) {
		for (const item of balance_changes) {
			for (const [key, value] of Object.entries(item)) {
				console.log('EACH BALANCE CHANGE: ', key, value);

				// Find the matching token detail for this key
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
					? (normalizedTokenAmount * tokenDetail.tokenPriceUSD).toFixed(2)
					: 'Unknown';

				if (numericValue > 0) {
					positiveBalanceChanges.push(
						row(
							`${tokenName} (${symbol})`,
							text(
								`+${normalizedTokenAmount} ${tokenDetail?.tokenPriceUSD ? `($${transferAmountInUSD} USD)` : ''}`,
							),
						),
					);
				} else {
					negativeBalanceChanges.push(
						row(
							`${tokenName} (${symbol})`,
							text(
								`${normalizedTokenAmount} ${tokenDetail?.tokenPriceUSD ? `($${transferAmountInUSD} USD)` : ''}`,
							),
						),
					);
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
				// Find the matching token detail for this key
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
						row('Token', text(`${tokenName} (${symbol})`)),
						row(
							'Token Address',
							address(tokenAddress as `0x${string}`),
						),
						row(
							'Spender',
							address(approval.spender_address as `0x${string}`),
						),
						row(
							'Approval Amount',
							text(approval.approve_amount.toString()),
						),
						divider(),
					);
				}
			}
		}
	}
	if (approvalChanges.length > 0) {
		contentArray.push(
			heading('⚠️ Approval Changes ⚠️'),
			...approvalChanges,
		);
	}

	if (positiveBalanceChanges.length > 0) {
		contentArray.push(
			heading('⬇️ Asset Inflows ⬇️'),
			...positiveBalanceChanges,
		);
	}
	if (negativeBalanceChanges.length > 0) {
		contentArray.push(
			heading('⚠️ Asset Outflows ⚠️'),
			...negativeBalanceChanges,
		);
	}
	if (
		positiveBalanceChanges.length == 0 &&
		negativeBalanceChanges.length == 0
	) {
		contentArray.push(text('No balance changes found'));
	}
	contentArray.push(divider());
	return contentArray;
}

function createErrorContent(resp: any) {
	const contentArray: any[] = [];
	console.log('Error Code:', resp.code);

	if (resp.code == '0040005') {
		contentArray.push(
			heading('⚠️ Transaction Simulation Failed ⚠️'),
			text(
				'The transaction simulation reverted. This transaction will likely fail.',
			),
		);
		console.log('Content Array for 0040005:', contentArray);
	}
	else if (resp.code == '0040006') {
		contentArray.push(
			heading('Transaction Simulation Failed'),
			text(
				'The transaction simulation reverted without a reason. This transaction will likely fail.',
			),
			
		);
		console.log('Content Array for 0040006:', contentArray);
	}
	else {
		console.error('Simulation error code:', resp.code), resp.error_data;
		return null;
	}
	return contentArray;
}
