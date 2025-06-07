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


export async function callDiTingTxSimulation(
	persistedUserData: any,
	chainId: string,
	toAddress: string,
	fromAddress: string,
	transactionGasHex: string,
	transactionValue: string,
	transactionData: string,
) {
}