import { remove0x } from '@metamask/utils';

import { v4 as uuidv4 } from 'uuid';
import * as CryptoJS from 'crypto-js';

/**
 * The function signatures for the different types of transactions. This is used
 * to determine the type of transaction. This list is not exhaustive, and only
 * contains the most common types of transactions for demonstration purposes.
 */
const FUNCTION_SIGNATURES = [
  {
    name: 'ERC-20',
    signature: 'a9059cbb',
  },
  {
    name: 'ERC-721',
    signature: '23b872dd',
  },
  {
    name: 'ERC-1155',
    signature: 'f242432a',
  },
];

/**
 * Decode the transaction data. This checks the signature of the function that
 * is being called, and returns the type of transaction.
 *
 * @param data - The transaction data. This is expected to be a hex string,
 * containing the function signature and the parameters.
 * @returns The type of transaction, or "Unknown," if the function signature
 * does not match any known signatures.
 */
export function decodeData(data: string) {
  const normalisedData = remove0x(data);
  const signature = normalisedData.slice(0, 8);

  const functionSignature = FUNCTION_SIGNATURES.find(
    (value) => value.signature === signature,
  );

  return functionSignature?.name ?? 'Unknown';
}


export const isEthereumAddress = (address: string) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};


async function formatHashDitQuery(transaction: any) {
  const transactionDestination = transaction.to;
  const body = {
    "address":transactionDestination,
    "chain_id":"56"};
  
  // Extension code will be opensource - Need to hide these keys
  const appId = '42b7d48e81754984b624';
  const appSecret = '03909eb04c894bd29a79f9e1127847c6';
  const timestamp = new Date().getTime();
  const nonce = uuidv4().replace(/-/g, '');

  const bodyString = JSON.stringify(body);
  const dataToSign = `${appId};${timestamp};${nonce};POST;/security-api/public/app/v1/detect;${JSON.stringify(bodyString)}`;
  const hash = CryptoJS.HmacSHA256(dataToSign, appSecret);
  const signature = CryptoJS.enc.Hex.stringify(hash);

  
  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "X-Signature-appid": appId,
    "X-Signature-timestamp": timestamp,
    "X-Signature-nonce": nonce,
    "X-Signature-signature": signature
  };
  return await getHashDitResponse('https://api.hashdit.io/security-api/public/app/v1/detect', body, headers);
}


async function getHashDitResponse(url: string, body: any, header: any) {
  // const urlObj = new URL(url);
  // urlObj.searchParams.append("business", businessName);

  const response = await fetch('https://api.hashdit.io/security-api/public/app/v1/detect', {
    method: 'POST',
    mode: "cors",
    cache: "no-cache",
    credentials: "same-origin",
    body: JSON.stringify(body),
    headers: header,
    redirect: "follow",
    referrerPolicy: "no-referrer"
    });
  return await response.json();
}