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
import { determineSpenderRiskInfo } from './utils';
import { getHashDitResponse } from './api';
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
	// TODO Change to user address
	const fromAddressChecksum = toChecksumAddress(fromAddress);

	const url = 'https://service.hashdit.io/v2/hashdit/txn-simulation';
	const postBody = {
		chain_id: chainIdNumber,
		block_height: currentBlockHeight,

		evm_transactions: [
			{
				from: fromAddressChecksum,
				to: toAddressChecksum,

				value: valueNumber,
				gas: transactionGasNumber,
				data: transactionData,
	
				force: true,
			},
		],
		requested_items: {
			balance_changes: true,
			approve_changes: true,
			ownership_changes: true,
			involved_address_risks: true,
			invocation_tree: false
		},
	};
	// Make the API call
	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-API-KEY': apiKey,
		},
		body: JSON.stringify(postBody),
	});
	console.log('Simulation Response', response);
}
