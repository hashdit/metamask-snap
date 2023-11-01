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


export async function getHashDitResponse(transaction: any, transactionUrl: any, chainId: string, businessName: string) {
  console.log("getHashDitResponse");
  console.log(transaction);
  console.log(transactionUrl, chainId, businessName);

  // formatting chainid to match api formatting
  let chain: string;
  switch (chainId) {
      case "eip155:1":
        chain = "0x1";
        break;
      case "eip155:38":
        chain = "0x56";
        break;
      default:
        chain = "0x1"; // only to stop errors, need to find good default
  }

  let postBody: any = {};
  if (businessName == "hashdit_snap_tx_api_url_detection") {
    postBody.url = transactionUrl;

  } else if (businessName == "address_screening") {
    postBody.address = transaction.to;
    postBody.chain_id = chain;
  
  } else if (businessName == "hashdit_snap_tx_api_transaction_request") {
    postBody.address = transaction.to;
    postBody.chain_id = chain;
    postBody.trace_id = "5c978e09-1508-4ab0-8550-4d3e6640b9d4"; // random string e.g. "5c978e09-1508-4ab0-8550-4d3e6640b9c3", need to be generated
    postBody.transaction = transaction;
    postBody.url = transactionUrl;

  } else if (businessName == "hashdit_snap_tx_api_signature_request") {
    postBody.address = transaction.to;
    postBody.chain_id = chain;
    postBody.message = "0xdeadbeef"; // should be signature message
    postBody.method = "eth_sign";
    postBody.trace_id = "5c978e09-1508-4ab0-8550-4d3e6640b9d4"; // random string e.g. "5c978e09-1508-4ab0-8550-4d3e6640b9c3", needs to be generated
    postBody.url = transactionUrl;
  }
  console.log("postbody: ", postBody);
  // Extension code will be opensource - Need to hide these keys
  const appId = 'a3d194daa5b64414bbaa';
  const appSecret = 'b9a0ce86159b4eb4ab94bbb80503139d';
  const timestamp = new Date().getTime();
  const nonce = uuidv4().replace(/-/g, '');

  const dataToSign = `${appId};${timestamp};${nonce};POST;/security-api/public/app/v1/detect;${JSON.stringify(postBody)}`;
  const hash = CryptoJS.HmacSHA256(dataToSign, appSecret);
  const signature = CryptoJS.enc.Hex.stringify(hash);

  const url = new URL('https://api.hashdit.io/security-api/public/app/v1/detect');
  url.searchParams.append("business", businessName);

  const response = await fetch(url, {
    method: 'POST',
    cache: "no-cache",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "Access-Control-Allow-Origin":"*", 
      "X-Signature-appid": appId,
      "X-Signature-timestamp": timestamp.toString(),
      "X-Signature-nonce": nonce,
      "X-Signature-signature": signature
    },
    redirect: "follow",
    referrerPolicy: "no-referrer",
    body: JSON.stringify(postBody),
  });

  const resp = await response.json();
  console.log("response: ", resp);

  if (resp.status == "OK" && resp.data) {
    return resp.data;
  } else {
    throw Error("Fetch api error: " + resp.errorData);
  }
}


// async function getHashDitResponse(url: string, body: any, header: any) {
//   // const urlObj = new URL(url);
//   // urlObj.searchParams.append("business", businessName);

//   const response = await fetch('https://api.hashdit.io/security-api/public/app/v1/detect', {
//     method: 'POST',
//     mode: "cors",
//     cache: "no-cache",
//     credentials: "same-origin",
//     body: JSON.stringify(body),
//     headers: header,
//     redirect: "follow",
//     referrerPolicy: "no-referrer"
//     });
//   return await response.json();
// }