import type { OnTransactionHandler } from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';

import { v4 as uuidv4 } from 'uuid';
import * as CryptoJS from 'crypto-js';

async function getHashDitResponse(url: string, body: any, header: any) {
  const response = await fetch('https://api.hashdit.io/security-api/public/app/v1/detect', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: header
    });
  return await response.json();
}


// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  const transactionDestination = transaction.to;
  const body = {
    "address":"0x312bc7eaaf93f1c60dc5afc115fccde161055fb0",
    "chain_id":"56"};
  
  const appId = '42b7d48e81754984b624';
  const appSecret = '03909eb04c894bd29a79f9e1127847c6';
  const timestamp = new Date().getTime();
  const nonce = uuidv4().replace(/-/g, '');

  const bodyString = JSON.stringify(body);
  const dataToSign = `${appId};${timestamp};${nonce};POST;/security-api/public/app/v1/detect;${bodyString}`;
  const hash = CryptoJS.HmacSHA256(dataToSign, appSecret);
  const signature = CryptoJS.enc.Hex.stringify(hash);
  
  const headers = {
    "Content-Type": "application/json;charset=UTF-8",
    "X-Signature-appid": appId,
    "X-Signature-timestamp": timestamp,
    "X-Signature-nonce": nonce,
    "X-Signature-signature": signature,
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'POST,PATCH,OPTIONS'
  };

  const response = await getHashDitResponse('https://api.hashdit.io/security-api/public/app/v1/detect', body, headers);
  console.log(response);

  return {
  content: panel([
    heading('HashDit Security Insights'),
    text(
      `As set up, you are transfering to **${transactionDestination}**`,
      ),
    heading('HashDit Security Response'),
    text(
      `HashDit Response: **${response}**`,
      ),
    ]),
  };
};

// return {
//   content: panel([
//     heading('HashDit Security Insights'),
//     text(
//       `As set up, you are paying **${gasFeesPercentage.toFixed(
//         2,
//       )}%** in gas fees for this transaction.`,
//     ),
//   ]),
// };
// };