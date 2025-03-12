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
import { determineSpenderRiskInfo } from './signatureInsight';
import { getHashDitResponse } from './api';

export async function callDiTingTxSimulation(
	persistedUserData: any,
	chainId: string,
	toAddress: string,
	fromAddress: string,
	transactionGasHex: string,
	transactionValue: string,
	transactionData: string,
) {
	let transferAmount;
	let transferRecipient;
	const isERC20Transfer = isERC20TransferOrTransferFrom(transactionData);
	console.log('isERC20Transfer', isERC20Transfer);

	if (isERC20Transfer) {
		// Destructure the result into respective variables
		const result = extractTransferAmountAndRecipient(transactionData);
		transferRecipient = result[0];
		transferAmount = result[1];

		console.log(
			'Transfer Selector Detected',
			transferAmount,
			transferRecipient,
		);
	}

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
				Insufficient_Native_Token: 'Insufficient Native Token',
				Node_Connection_Error: 'Node Connection Error',
				Gas_Exceeds_Block_Limit: 'Gas Exceeds Block Limit',
				Ran_Out_Of_Gas: 'Ran Out Of Gas',
				HTTP_Connection_Error: 'HTTP Connection Error',
			};

			// Map error categories to custom messages
			const errorMessages: Record<string, string> = {
				Gas_Insufficient: `${errorMessage}. You need to increase the gas limit to complete this transaction.`,
				Transaction_Reverted:
					'This transaction is likely to fail. A transaction might fail because of insufficient gas, insufficient tokens to transfer, missing permissions, or network congestion.',
				Insufficient_Native_Token:
					'This transaction is likely to fail. A transaction might fail because of insufficient gas, insufficient tokens to transfer, missing permissions, or network congestion.',
				Node_Connection_Error:
					"We're having trouble connecting to the network. This might be due to internet issues or network congestion. Please try again later.",
				Gas_Exceeds_Block_Limit:
					'This transaction needs more gas than the network allows right now. Try lowering the gas usage or waiting for network conditions to improve.',
				Ran_Out_Of_Gas:
					'Your transaction used up all its gas before it could finish. Try increasing the gas limit and resubmitting.',
				HTTP_Connection_Error:
					'There was a connection issue with the network. Please check your internet or try switching networks.',
			};

			const errorTitle = errorTitles[errorCategory] || 'Error';
			const customErrorMessage =
				errorMessages[errorCategory] ||
				(errorMessage ? errorMessage : 'An unknown error occurred.');
			//console.log('Error Title:', errorTitle);
			return createSimulationErrorContentArray(
				errorTitle,
				customErrorMessage,
			);
		}
		// Transaction valid
		else {
			const approvalChangeArray = await getUserApprovalChanges(
				result,
				fromAddress,
				chainId,
				persistedUserData,
			);

			const balanceChangeArray = getUserBalanceChanges(
				result,
				fromAddress,
				chainId,
			);

			let headingArray: any[] = [
				heading('Transaction Simulation'),
				row('Status', text('Success ✅')),
			];
			let transferTaxPercent = 0;

			// If the transaction is a ERC20 transfer, show transfer tax
			if (isERC20Transfer) {
				transferTaxPercent = Number(
					getTransferTax(
						result,
						fromAddress.toLowerCase(),
						transferRecipient?.toLowerCase(),
					).toFixed(2),
				);

				if (transferTaxPercent >= 20) {
					headingArray.push(
						row(
							'Transfer Tax',
							text(
								`${Math.abs(
									transferTaxPercent,
								).toString()}% ⛔️`,
							),
						),
						text(
							`⚠️ High transfer tax detected. This tax is deducted from the total amount being transferred, resulting in a significant loss of tokens.`,
						),
					);
				} else if (transferTaxPercent >= 10) {
					headingArray.push(
						row(
							'Transfer Tax',
							text(
								`${Math.abs(
									transferTaxPercent,
								).toString()}% ⚠️`,
							),
						),
						text(
							'Medium transfer tax detected. This tax is deducted from the total amount being transferred, resulting in a moderate loss of tokens.',
						),
					);
				} else if (transferTaxPercent >= 5) {
					headingArray.push(
						row(
							'Transfer Tax',
							text(`${Math.abs(transferTaxPercent).toString()}%`),
						),
						text(
							'Low transfer tax detected. This tax is deducted from the total amount being transferred, resulting in a small loss of tokens.',
						),
					);
				} else {
					headingArray.push(
						row(
							'Transfer Tax',
							text(`${Math.abs(transferTaxPercent).toString()}%`),
						),
					);
				}
			}

			console.log('balanceArray', balanceChangeArray);

			// Merge all the resulting arrays
			const mergedArray = [
				...(headingArray || []),
				...(balanceChangeArray || []),
				...(approvalChangeArray && approvalChangeArray?.length > 0
					? [divider(), heading('Spender Screening')]
					: []),
				...(approvalChangeArray || []),
			];

			// Return the merged array
			return mergedArray;
		}
	} catch (error) {
		console.error('Error in callDiTingTxSimulation:', error);
		return [
			heading('Transaction Simulation'),
			text(
				'An error has occurred while simulating the transaction. Please try again.',
			),
		];
	}
}

async function getUserApprovalChanges(
	simulationResult: any,
	userAddress: string,
	chainId: string,
	persistedUserData: any,
) {
	let contentArray: any[] = [];

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

					// Todo: Switch to new blacklist API
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
			const spenderRiskInfo = determineSpenderRiskInfo(0);
			contentArray.push(
				row('Risk Level', text('Low')),
				row('Approver', address(approver)),
				row('Spender', address(spender)),
				row('Amount', text(formattedBalanceChange)),
				text(spenderRiskInfo[1]),
				divider(),
			);
		}

		console.log('approval contentArray', contentArray);
		return;
	}
}

function getTransferTax(
	simulationResult: any,
	senderAddress: string,
	receiverAddress: any,
) {
	try {
		const balanceChanges =
			simulationResult?.data?.txn_summaries?.[0]?.balance_changes;
		if (!balanceChanges || Object.keys(balanceChanges).length === 0) {
			console.log('No balance change found');
			return 0;
		}

		// Get sender's token changes safely
		const senderTokenChange = balanceChanges[senderAddress];
		if (!senderTokenChange || Object.keys(senderTokenChange).length === 0) {
			console.log('No token changes found for sender');
			return 0;
		}

		// Get the first token (assuming sender sends only one type of token)
		const firstToken = Object.keys(senderTokenChange)[0];
		if (!firstToken) {
			console.log('No token found in sender balance changes');
			return 0;
		}

		// Ensure the sender has a balance change for the token
		const senderBalanceChange = senderTokenChange[firstToken];
		if (senderBalanceChange === undefined) {
			console.log('No matching token found for the sender address');
			return 0;
		}

		// Ensure sender balance change is a positive number
		const absSenderBalanceChange = Math.abs(Number(senderBalanceChange));
		if (absSenderBalanceChange === 0) {
			console.log(
				'Sender balance change is zero, avoiding division by zero',
			);
			return 0;
		}

		console.log('Sender', senderTokenChange, firstToken);

		// Get receiver's token change safely
		const receiverTokenChange = balanceChanges[receiverAddress];
		if (!receiverTokenChange) {
			console.log('No token changes found for receiver');
			return 0;
		}

		// Ensure the receiver has a balance change for the same token
		const receiverBalanceChange = receiverTokenChange[firstToken];
		if (receiverBalanceChange === undefined) {
			console.log('No matching token found for the receiver address');
			return 0;
		}

		// Convert receiverBalanceChange to a number
		const numReceiverBalanceChange = Number(receiverBalanceChange);

		console.log(
			'Sender & Receiver',
			firstToken,
			receiverTokenChange,
			numReceiverBalanceChange,
			absSenderBalanceChange,
		);

		// Compute and return transfer tax
		const transferTax =
			(1 - numReceiverBalanceChange / absSenderBalanceChange) * 100;
		console.log('Transfer Tax:', transferTax);

		return transferTax;
	} catch (error) {
		console.error('Error getting transfer tax:', error);
		return 0;
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

	let contentArray: any[] = [];
	let positiveChanges: any[] = [];
	let negativeChanges: any[] = [];
	let positiveValue = 0;
	let negativeValue = 0;
	if (!balanceChanges || Object.entries(balanceChanges).length == 0) {
		contentArray.push(
			text(
				'No balance changes detected. No tokens are being sent or received in this transaction.',
			),
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
				const formattedBalanceChange = Math.abs(
					tokenBalanceChange / Math.pow(10, divisor),
				);
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

				if (tokenBalanceChange >= 0) {
					// If undefined symbol, we show token address instead
					// Create "Asset In" rows
					if (symbol == undefined) {
						positiveChanges.push(row('Token', address(`${token}`)));
						positiveChanges.push(
							row(
								'Amount',
								text(`+${formattedBalanceChange} (≈ N/A)`),
							),
						);
					} else {
						if (isNaN(transferValue)) {
							positiveChanges.push(
								row(
									'Token',
									text(
										`+${formattedBalanceChange} ${symbol} (≈ N/A)`,
									),
								),
							);
						} else {
							// Show amount + symbol in one row
							positiveChanges.push(
								row(
									'Token',
									text(
										`+${formattedBalanceChange} ${symbol} (≈ $${transferValue.toFixed(
											2,
										)})`,
									),
								),
							);
						}
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
							row(
								'Amount',
								text(`-${formattedBalanceChange} (≈ N/A)`),
							),
						);
					} else {
						if (isNaN(transferValue)) {
							negativeChanges.push(
								row(
									'Token',
									text(
										`-${formattedBalanceChange} ${symbol} (≈ N/A)`,
									),
								),
							);
						} else {
							// Show amount + symbol in one row
							negativeChanges.push(
								row(
									'Token',
									text(
										`-${formattedBalanceChange} ${symbol} (≈ $${transferValue.toFixed(
											2,
										)})`,
									),
								),
							);
						}
					}

					negativeValue += transferValue;

					console.log(
						`Token: ${token}, Balance Change: ${formattedBalanceChange}`,
					);
				}
			}
			// Calculate value difference between assets in and assets out
			const valueDifference = positiveValue - negativeValue;
			let sign = '+';

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
					sign = '-';
				}

				contentArray.push(
					row(
						'Total Value Change',
						text(
							`${sign}$${Math.abs(valueDifference)
								.toFixed(4)
								.toString()} USD`,
						),
					),
				);
			}

			// Add all negative balance changes to the contentArray
			if (negativeChanges.length !== 0) {
				contentArray.push(
					divider(),
					text('**Outflows ⬆️**'),
					...negativeChanges,
				);

				// If there are outflows but no inflow, show warning message.
				if (positiveChanges.length === 0) {
					contentArray.push(
						divider(),
						text('**Inflows ❌**'),
						text(
							'You are transferring tokens out of your wallet, but you will **not receive any tokens from this transaction**. Verify the transaction details to avoid potential loss of funds.',
						),
					);
				}
			}
			// Add all positive balance changes to the contentArray
			if (positiveChanges.length !== 0) {
				contentArray.push(
					divider(),
					text('**Inflows ⬇️**'),
					...positiveChanges,
				);
			}

			return contentArray;
		}
	}
	// Add fallback? No user tokens moved?
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


export async function getBlockHeight() {
	try {
		// Use the snap's provider to call the eth_blockNumber method
		const blockNumberHex = (await ethereum.request({
			method: 'eth_blockNumber',
		})) as string;

		// Convert the hex block number to a decimal number
		const blockNumber = parseInt(blockNumberHex, 16);

		//console.log(`Current Block Height: ${blockNumber}`);
		return blockNumber.toString();
	} catch (error) {
		console.error('Error retrieving block height:', error);
		throw error;
	}
}

// ERC-20 transfer function selector
const erc20TransferSelector = '0xa9059cbb';
// ERC-20 transferFrom function selector
const erc20TransferFromSelector = '0x23b872dd';

function isERC20TransferOrTransferFrom(transactionData: String) {
	// Ensure the input data is a valid hex string
	if (
		!transactionData ||
		!transactionData.startsWith('0x') ||
		transactionData.length < 10
	) {
		return false;
	}

	// Extract the first 4 bytes (8 hex characters after '0x')
	const functionSelector = transactionData.slice(0, 10).toLowerCase();

	// Check if the function selector matches
	if (
		functionSelector === erc20TransferSelector ||
		functionSelector === erc20TransferFromSelector
	) {
		return true;
	}
	return false;
}

function extractTransferAmountAndRecipient(transactionData: string) {
	if (!transactionData.startsWith('0x') || transactionData.length < 138) {
		console.error('Invalid transaction data');
		return [null, null];
	}

	// Get function selector (first 4 bytes)
	const functionSelector = transactionData.slice(0, 10).toLowerCase();

	if (functionSelector === '0xa9059cbb') {
		// transfer(address recipient, uint256 amount)
		let recipient = '0x' + transactionData.slice(10, 74); // Extract recipient address
		recipient = recipient.replace(/^0x0+/, '0x'); // Remove leading zeros after '0x'
		const amount = BigInt('0x' + transactionData.slice(74, 138)).toString(); // Extract amount
		return [recipient, amount];
	} else if (functionSelector === '0x23b872dd') {
		// transferFrom(address sender, address recipient, uint256 amount)
		let recipient = '0x' + transactionData.slice(74, 138); // Extract recipient address
		recipient = recipient.replace(/^0x0+/, '0x'); // Remove leading zeros after '0x'
		const amount = BigInt(
			'0x' + transactionData.slice(138 - 64),
		).toString(); // Extract amount
		return [recipient, amount];
	} else {
		console.error('Not a transfer or transferFrom function');
		return [null, null];
	}
}
