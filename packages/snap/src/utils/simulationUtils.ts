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
import { getHashDitResponse, isEOA, determineSpenderRiskInfo } from './utils';

export async function callDiTingTxSimulation(
	persistedUserData: any,
	chainId: string,
	toAddress: string,
	fromAddress: string,
	transactionGasHex: string,
	transactionValue: string,
	transactionData: string,
) {
	try {
		// Setup simulation API call parameters
		const ditingApiKey = persistedUserData.DiTingApiKey;
		const chainIdNumber = chainIdHexToNumber(chainId);
		const transactionGasNumber = parseInt(transactionGasHex, 16);
		const valueNumber = parseInt(transactionValue, 16).toString();
		const currentBlockHeight = await getBlockHeight();

		// Convert addresses to checksum format

		const toAddressChecksum = toChecksumAddress(toAddress);
		// TODO Change to user address
		const fromAddressChecksum = toChecksumAddress(fromAddress);

		const url = 'https://service.hashdit.io/v2/hashdit/txn-simulation';
		const postBody = {
			chain_id: chainIdNumber,
			block_height: currentBlockHeight,
			node_type: 'hardhat',
			transactions: [
				{
					to: toAddressChecksum,
					from: fromAddressChecksum,
					value: valueNumber,
					gas: transactionGasNumber,
					data: transactionData,
					mode: 'force',
					debug: true,
				},
			],
			requested_items: {
				balance_changes: true,
				approve_changes: true,
				involved_address_risks: true,
				invocation_tree: false,
			},
		};

		console.log('Post Body:', postBody);

		// Make the API call
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-KEY': ditingApiKey,
			},
			body: JSON.stringify(postBody),
		});

		// Parse the response
		const result = await response.json();
		console.log('Simulation Result:', JSON.stringify(result, null, 2));

		// Validate result structure
		if (
			!result?.data?.txn_summaries ||
			result.data.txn_summaries.length === 0
		) {
			console.error('Invalid simulation response structure:', result);
			return;
		}

		const evmTxnError = result.data.txn_summaries[0]?.evm_txn_error || '';

		// Transaction error found, parse the error
		if (evmTxnError) {
			const { errorCategory, errorMessage } =
				extractErrorCategoryAndMessage(evmTxnError);
			// console.log('Error Category:', errorCategory);
			// console.log('Error Message:', errorMessage);

			// Map error categories to titles
			const errorTitles: Record<string, string> = {
				Gas_Insufficient: 'Insufficient Gas',
				Transaction_Reverted: 'Transaction Reverted',
				Insufficient_Native_Token: 'Insufficient Tokens',
				Node_Connection_Error: 'Node Connection Error',
				Gas_Exceeds_Block_Limit: 'Gas Exceeds Block Limit',
				Ran_Out_Of_Gas: 'Ran Out Of Gas',
				HTTP_Connection_Error: 'HTTP Connection Error',
			};

			const errorTitle = errorTitles[errorCategory] || 'Other Error';
			//console.log('Error Title:', errorTitle);
			return createSimulationErrorContentArray(errorTitle, errorMessage);
		}
		// Transaction valid
		else {
			const approvalChangeArray = await getUserApprovalChanges(
				result,
				fromAddress,
				chainId,
				persistedUserData,
			);
			console.log('approvalArray', approvalChangeArray);

			const balanceChangeArray = getUserBalanceChanges(
				result,
				fromAddress,
				chainId,
			);
			console.log('balanceArray', balanceChangeArray);

			// Merge the two arrays
			const mergedArray = [
				...(approvalChangeArray && approvalChangeArray?.length > 0
					? [heading('Spender Screening')]
					: []),
				...(approvalChangeArray || []),

				...(balanceChangeArray || []),
			];

			// Return the merged array
			return mergedArray;
		}
	} catch (error) {
		console.error('Error in callDiTingTxSimulation:', error);
	}
}

async function getUserApprovalChanges(
	simulationResult: any,
	userAddress: string,
	chainId: string,
	persistedUserData: any,
) {
	let contentArray: any[] = [];
	const userAddressLower = userAddress.toLowerCase();
	// Approval changes from simulation result
	const approvalChanges =
		simulationResult?.data?.txn_summaries[0]?.approve_changes;

	const tokenDetails = simulationResult?.data?.token_details;

	// If object is empty, then no approvals found.
	if (!approvalChanges || Object.entries(approvalChanges).length == 0) {
		console.log('No Approval Changes found');
		return contentArray;
	}

	// Loop through each token being approved in `approvalChanges`
	for (const tokenBeingApproved in approvalChanges) {
		console.log(
			'tokenBeingApproved:',
			JSON.stringify(tokenBeingApproved, null, 2),
		);

		// Array of approval changes for a given token
		const approvalDetails = approvalChanges[tokenBeingApproved];
		console.log(
			'Approval Details :',
			JSON.stringify(approvalDetails, null, 2),
		);

		// Go through each user's address, since there can be an approval to the user's other accounts.
		const userAccounts = await ethereum.request({
			method: 'eth_accounts',
			params: [],
		});

		console.log('userAccounts', userAccounts);

		for (const singleApproval of approvalDetails) {
			const tokenInfo = tokenDetails[tokenBeingApproved];
			const amount = singleApproval.approve_amount;
			const spender = singleApproval.spender_address;
			const approver = singleApproval.approver_address;
			const divisor = tokenInfo?.divisor
				? parseInt(tokenInfo.divisor)
				: 18;
			const formattedBalanceChange = (
				amount / Math.pow(10, divisor)
			).toString();

			console.log(
				'singleApproval',
				amount,
				formattedBalanceChange,
				spender,
				approver,
			);
			if (Array.isArray(userAccounts)) {
				if (userAccounts.includes(approver)) {
					console.log(`Approver ${approver} exists in userAccounts.`);

					try {
						// Check if spender is an Externally Owned Address.
						// We consider approving to an EOA spender to be a high risk because there are few scenarios where this is needed.
						let isSpenderEOA = await isEOA(spender);
						console.log('isSpenderEOA', isSpenderEOA);
						// If spender is EOA and spender isn't blacklisted
						if (isSpenderEOA) {
							contentArray.push(
								row('Risk Level', text('⛔ High Risk ⛔')),
								row('Approver', address(approver)),
								row('Spender', address(spender)),
								row('Amount', text(formattedBalanceChange)),
								text(
									'This transaction is trying to approve your tokens to an Externally Owned Account (EOA), likely indicating a scam. Approving it will give a third-party direct access to your funds, risking potential loss. It is advised to reject this transaction.',
								),
								divider(),
							);
							console.log('approval contentArray', contentArray);
							return contentArray;
						}
					} catch (error) {
						console.error('Error with spender EOA check: ', error);
					}
					try {
						const spenderBlacklistResp = await getHashDitResponse(
							'signature_insight_blacklist',
							persistedUserData,
							null,
							null,
							chainId,
							spender,
						);
						console.log(
							'spenderBlacklistResp',
							spenderBlacklistResp,
						);
						if (spenderBlacklistResp != undefined) {
							if (spenderBlacklistResp.overall_risk != -1) {
								// Convert risk level to risk title
								const [riskTitle, riskOverview] =
									determineSpenderRiskInfo(
										spenderBlacklistResp.overall_risk,
									);
								contentArray.push(
									row('Risk Level', text(riskTitle)),
									row('Approver', address(approver)),
									row('Spender', address(spender)),
									row('Amount', text(formattedBalanceChange)),
									text(riskOverview),
									divider(),
								);

								return contentArray;
							}
						}
					} catch (error) {
						console.error(
							'Error with spender blacklist check: ',
							error,
						);
					}
				}
			}
			contentArray.push(
				row('Risk Level', text('Low')),
				row('Approver', address(approver)),
				row('Spender', address(spender)),
				row('Amount', text(formattedBalanceChange)),
				text(
					'This transaction’s spender is not blacklisted by HashDit. However, approving it will give a third-party direct access to your funds, risking potential loss. Please proceed with caution. Default risk level.',
				),
				divider(),
			);
		}

		console.log('approval contentArray', contentArray);
		return;
	}
}
function getUserBalanceChanges(
	simulationResult: any,
	userAddress: string,
	chainId: string,
) {
	const userAddressLower = userAddress.toLowerCase();
	const balanceChanges =
		simulationResult?.data?.txn_summaries[0]?.balance_changes;
	const tokenDetails = simulationResult?.data?.token_details;

	let contentArray: any[] = [
		heading('Transaction Simulation'),
		row('Status', text('Success ✅')),
	];
	let positiveChanges: any[] = [];
	let negativeChanges: any[] = [];
	let positiveValue = 0;
	let negativeValue = 0;
	if (!balanceChanges || Object.entries(balanceChanges).length == 0) {
		contentArray.push(
			divider(),
			text(
				'No balance changes detected. No tokens are being sent or received in this transaction.',
			),
			divider(),
		);
		return contentArray;
	}
	for (const singleBalanceChange in balanceChanges) {
		if (singleBalanceChange.toLowerCase() == userAddressLower) {
			//console.log("Found User:",balanceChanges[singleBalanceChange])
			const userTokens = balanceChanges[singleBalanceChange];

			// Loop through the tokens inside the user's balance changes
			for (const token in userTokens) {
				const tokenBalanceChange = userTokens[token];

				// Find the corresponding token details
				const tokenInfo = tokenDetails[token];

				let symbol = tokenInfo.symbol;

				const price = tokenInfo.tokenPriceUSD;
				const divisor = tokenInfo?.divisor
					? parseInt(tokenInfo.divisor)
					: 18;
				const formattedBalanceChange =
					Math.abs(tokenBalanceChange / Math.pow(10, divisor));
				const transferValue = price * formattedBalanceChange;
				console.log(
					'Token Info',
					tokenInfo,
					symbol,
					price,
					divisor,
					formattedBalanceChange,
					transferValue,
				);
				// If token is native_token key, then manually set symbol to ETH or BNB, depending on chain.
				// Simulation should only be called on ETH and BSC chain, so no need to handle other chains
				if (token == 'native_token') {
					if (chainId == '0x1') {
						symbol = 'ETH';
					} else if (chainId == '0x38') {
						symbol = 'BNB';
					}
				}
				// // Assets in
				// if (tokenBalanceChange >= 0) {
				// 	// If undefined symbol, we show token address instead
				// 	// Create "Asset In" rows
				// 	if (symbol == undefined) {
				// 		positiveChanges.push(row('Token', address(`${token}`)));
				// 		positiveChanges.push(
				// 			row('Amount', text(`+${formattedBalanceChange}`)),
				// 		);
				// 	} else {
				// 		// Show amount + symbol in one row
				// 		positiveChanges.push(
				// 			row(
				// 				'Amount',
				// 				text(`+${formattedBalanceChange} ${symbol}`),
				// 			),
				// 		);
				// 	}
				// 	if (isNaN(transferValue)) {
				// 		positiveChanges.push(row('Value', text(`N/A`)));
				// 	} else {
				// 		positiveChanges.push(
				// 			row(
				// 				'Value',
				// 				text(`+$${transferValue.toFixed(4)} USD`),
				// 			),
				// 		);
				// 	}

				// 	positiveValue += transferValue;
				// }
				if (tokenBalanceChange >= 0) {
					// If undefined symbol, we show token address instead
					// Create "Asset In" rows
					if (symbol == undefined) {
						positiveChanges.push(row('Token', address(`${token}`)));
						positiveChanges.push(
							row('Amount', text(`+${formattedBalanceChange}`),),
						);
					} else {
						if(isNaN(transferValue)){
							positiveChanges.push(
								row(
									'Token',
									text(`+${formattedBalanceChange} ${symbol} (≈ N/A)`),
	
								),
							);
						}
						// Show amount + symbol in one row
						positiveChanges.push(
							row(
								'Token',
								text(`+${formattedBalanceChange} ${symbol} (≈ $${transferValue.toFixed(2)})`),

							),
						);
					}

					positiveValue += transferValue;
				}
				//Assets Out
				else {
					// If undefined symbol, we show token address instead
					// Create "Asset Out" rows
					if (symbol == undefined) {
						negativeChanges.push(row('Token', address(`${token}`)));
						negativeChanges.push(
							row('Amount', text(`-${formattedBalanceChange}`),),
						);
					} else {
						if(isNaN(transferValue)){
							negativeChanges.push(
								row(
									'Token',
									text(`-${formattedBalanceChange} ${symbol} (≈ N/A)`),
	
								),
							);
						}
						// Show amount + symbol in one row
						negativeChanges.push(
							row(
								'Token',
								text(`-${formattedBalanceChange} ${symbol} (≈ $${transferValue.toFixed(2)})`),

							),
						);
					}

					positiveValue += transferValue;
					// // If undefined symbol, we show token address instead
					// // Create "Asset Out" rows
					// if (symbol == undefined) {
					// 	negativeChanges.push(row('Token', address(`${token}`)));
					// 	negativeChanges.push(
					// 		row('Amount', text(`${formattedBalanceChange}`)),
					// 	);
					// } else {
					// 	// Show amount + symbol in one row
					// 	negativeChanges.push(
					// 		row(
					// 			'Amount',
					// 			text(`${formattedBalanceChange} ${symbol}`),
					// 		),
					// 	);
					// }

					// // If transfer value is not an number, show N/A
					// if (isNaN(transferValue)) {
					// 	negativeChanges.push(row('Value', text(`N/A`)));
					// } else {
					// 	negativeChanges.push(
					// 		row(
					// 			'Value',
					// 			text(
					// 				`-$${Math.abs(transferValue).toFixed(
					// 					4,
					// 				)} USD`,
					// 			),
					// 		),
					// 	);
					// }

					// negativeValue = transferValue;
				}
				console.log(
					`Token: ${token}, Balance Change: ${formattedBalanceChange}`,
				);
			}

			// Calculate value difference between assets in and assets out
			const valueDifference = positiveValue - negativeValue;
			let symbol = '+';

			// Show the value difference of the transaction. If an error occurred fetching values, return N/A.
			if (isNaN(valueDifference)) {
				console.error('One of the values is NaN:', {
					positiveValue,
					negativeValue,
					valueDifference,
				});

				contentArray.push(row('Total Value Change', text(`N/A`)));
			} else {
				console.log(
					'Diff',
					positiveValue,
					negativeValue,
					valueDifference,
				);
				if (valueDifference < 0) {
					symbol = '-';
				}

				contentArray.push(
					row(
						'Total Value Change',
						text(
							`${symbol}$${Math.abs(valueDifference)
								.toFixed(4)
								.toString()} USD`,
						),
					),
				);
			}

			if (negativeChanges.length !== 0) {
				contentArray.push(
					divider(),
					text('**Outflows ⬇️**'),
					...negativeChanges,
				);

				if (positiveChanges.length === 0) {
					contentArray.push(
						divider(),
						text('**Outflows ❌**'),
						text(
							'You are transferring tokens out of your wallet, but you will **not receive any tokens from this transaction**. Verify the transaction details to avoid potential loss of funds.',
						),
					);
				}
			}

			if (positiveChanges.length !== 0) {
				contentArray.push(
					divider(),
					text('**Inflows ⬆️**'),
					...positiveChanges,
				);
			}

			return contentArray;
		}
	}
}

function createSimulationErrorContentArray(
	errorTitle: String,
	errorMessage: String,
) {
	let contentArray: any[] = [
		heading('Transaction Simulation'),
		row('Status', text('Failed ❌')),
	];
	if (
		errorTitle == 'Node Connection Error' ||
		errorTitle == 'HTTP Connection Error' ||
		errorTitle == 'Other Error'
	) {
		contentArray.push(
			text(`${errorTitle}`),
			text(
				'A network error occurred during the transaction simulation. Please try again later or try reinstalling HashDit Snaps.',
			),
		);
		return contentArray;
	} else {
		contentArray.push(text(`${errorTitle}`), text(`${errorMessage}`));
		return contentArray;
	}
}

function extractErrorCategoryAndMessage(error: string): {
	errorCategory: string;
	errorMessage: string;
} {
	// Updated regular expression to account for the space after the period
	const categoryMatch = error.match(
		/Error from EVM during the txn execution\.\s*(.*?):/,
	);

	// Regular expression to match the message field
	const messageMatch = error.match(/'message':\s*["](.*?)["]/);
	// If matches are found, return the error category and message
	if (categoryMatch && messageMatch) {
		const errorCategory = categoryMatch[1].trim(); // Extract the error category
		const errorMessage = messageMatch[1]; // Extract the message
		return { errorCategory, errorMessage };
	}

	// Return a fallback if no matches are found
	return {
		errorCategory: 'Unknown Error Category',
		errorMessage: 'Invalid error format',
	};
}

function toChecksumAddress(address: string): string {
	// Remove '0x' prefix and convert to lowercase
	address = address.toLowerCase().replace('0x', '');

	// Get the keccak256 hash of the address
	const hash = keccak256(address);

	// Create a checksummed address
	let checksumAddress = '0x';
	for (let i = 0; i < address.length; i++) {
		// Uppercase the address character if the corresponding hash character is greater than 8
		checksumAddress +=
			parseInt(hash[i], 16) >= 8 ? address[i].toUpperCase() : address[i];
	}

	return checksumAddress;
}

function chainIdHexToNumber(chainId: string): number {
	const chainMap: Record<string, number> = {
		'0x1': 1,
		'0x38': 56,
	};
	return chainMap[chainId] || 56;
}

export async function getBlockHeight() {
	try {
		// Use the snap's provider to call the eth_blockNumber method
		const blockNumberHex = (await ethereum.request({
			method: 'eth_blockNumber',
		})) as string;

		// Convert the hex block number to a decimal number
		const blockNumber = parseInt(blockNumberHex, 16);

		console.log(`Current Block Height: ${blockNumber}`);
		return blockNumber.toString();
	} catch (error) {
		console.error('Error retrieving block height:', error);
		throw error;
	}
}


function roundDownToTwoSignificantDigits(num) {
	if (num === 0) return 0;
  
	const order = Math.floor(Math.log10(Math.abs(num))) - 1;
	const factor = Math.pow(10, order);
  
	return Math.floor(num / factor) * factor;
  }