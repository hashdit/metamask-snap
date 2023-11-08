import { remove0x, add0x } from '@metamask/utils';
 import { decode } from '@metamask/abi-utils';
 import { ethers } from 'ethers';

import { v4 as uuidv4 } from 'uuid';
import * as CryptoJS from 'crypto-js';
import hmacSHA256 from "crypto-js/hmac-sha256";
import encHex from "crypto-js/enc-hex";
import { trace } from 'console';
import { CHAINS_INFO } from "./chains";

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

export async function getHashDitResponse(businessName: string, transactionUrl?: any, transaction?: any, chainId?: string) {
  console.log("getHashDitResponse");
  console.log(transaction);
  console.log(transactionUrl, chainId, businessName);

  const trace_id = uuidv4(); // unique id for each screening, allowing users to report issues and for us to track issues

  // Todo: If BSC network is the only chain supported by HashDit, then we could remove this switch case.
  // formatting chainid to match api formatting
  let chain: string;
  switch (chainId) {
      case "0x1":
        chain = "1";
        break;
      case "0x38":
        chain = "56";
        break;
      default:
        chain = "56"; // only to stop errors, need to find good default
  }

  let postBody: any = {};
  if (businessName == "hashdit_snap_tx_api_url_detection") {
    postBody.url = transactionUrl;

  } else if (businessName == "hashdit_native_transfer") {
    postBody.address = transaction.to;
    postBody.chain_id = chain;

  } else if (businessName == "hashdit_snap_tx_api_transaction_request") {
    postBody.address = transaction.to;
    postBody.chain_id = chain;
    postBody.trace_id = trace_id;
    postBody.transaction = JSON.stringify(transaction);
    console.log("transaction: ", transaction);
    postBody.url = transactionUrl;

  } else if (businessName == "hashdit_snap_tx_api_signature_request") {
    postBody.address = transaction.to;
    postBody.chain_id = chain;
    postBody.message = "0xdeadbeef"; // should be signature message
    postBody.method = "eth_sign";
    postBody.trace_id = trace_id;
    postBody.url = transactionUrl;
  }
  console.log("postbody: ", postBody);
  let appId: string;
  let appSecret: string;

  const timestamp = Date.now();
  const nonce = uuidv4().replace(/-/g, '');

  const url = new URL('https://cb.commonservice.io/security-api/public/app/v1/detect');

  let dataToSign: string;
  if (businessName === "hashdit_native_transfer") {
    appId = '42b7d48e81754984b624';
    appSecret = '03909eb04c894bd29a79f9e1127847c6';
    dataToSign = `${appId};${timestamp};${nonce};POST;/security-api/public/app/v1/detect;${JSON.stringify(postBody)}`;

  } else {
    appId = 'a3d194daa5b64414bbaa';
    appSecret = 'b9a0ce86159b4eb4ab94bbb80503139d';
    url.searchParams.append("business", businessName);
    const query = url.search.substring(1);
    dataToSign = `${appId};${timestamp};${nonce};POST;/security-api/public/app/v1/detect;${query};${JSON.stringify(postBody)}`;
  }

  const signature = hmacSHA256(dataToSign, appSecret);
  const signatureFinal = encHex.stringify(signature);

  const response = await customFetch(url, postBody, appId, timestamp, nonce, signatureFinal);
  return formatResponse(response, businessName, trace_id);
}


function formatResponse(resp: any, businessName: string, trace_id: any){
  console.log("data: ", resp)
  let responseData: any = {
    overall_risk: -1,
    overall_risk_title: "Unknown Risk",
    overall_risk_detail: "No details",
    url_risk: -1,
    function_name: "",
    function_param1: "",
    function_param2: "",
    transaction_risk_detail: "None found",
    trace_id: trace_id,
  };

  if (businessName == "hashdit_snap_tx_api_url_detection") {
    responseData.url_risk = resp.risk_level;

    // const risk_details = JSON.parse(resp.risk_detail);
    // responseData.url_risk_title = risk_details.name;
    // responseData.url_risk_detail = risk_details.value;
  
  } else if (businessName == "hashdit_native_transfer") {
    responseData.overall_risk = resp.risk_level;
    responseData.overall_risk_title = resp.risk_level_title;
    responseData.overall_risk_detail = resp.risk_detail_simple;

  } else if (businessName == "hashdit_snap_tx_api_transaction_request") { // Need to add "addresses" risks
    if (resp.detection_result != null) {
      console.log("detectionResults: ", resp.detection_result)
      const detectionResults = resp.detection_result.risks;
      console.log("detectionResults2: ", JSON.stringify(detectionResults, null, 2))
      responseData.overall_risk = detectionResults.risk_level;

      // Get function name and params - catch if none returned
      try {
        const paramsCopy = [...resp.detection_result.params];
        console.log("params: ", JSON.stringify(paramsCopy, null, 2));
        // for (const [index, params] of paramsCopy.entries()) {
        //   console.log(`params${index}: `, params);
        // }
        
        responseData.function_name = resp.detection_result.function_name;
        responseData.function_params = paramsCopy;
      } catch {
        console.log("No params")
      }

      // Get most risky transaction risk detail - catch if none returned
      try {
        const transactionData = [...detectionResults.transaction];
        responseData.transaction_risk_detail = transactionData[0].risk_detail;
      } catch {
        console.log("No transaction data")
      }

      responseData.url_risk = detectionResults.url.risk_level;

      if (responseData.url_risk >= 4) {
        responseData.url_risk_title = "⚠️ Interaction with a dangerous site ⚠️";
      } else if (responseData.url_risk >= 2) {
        responseData.url_risk_title = "⚠️ Interaction with a suspicious site ⚠️";
      }
    }

  } else if (businessName == "hashdit_snap_tx_api_signature_request") {
    // This will be utilised in v2
  }

  if (responseData.overall_risk >= 4) {
    responseData.overall_risk_title = "⚠️ High Risk ⚠️";
    responseData.overall_risk_detail = "This transaction is considered high risk. It is advised to reject this transcation.";
  } else if (responseData.overall_risk >= 2) {
    responseData.overall_risk_title = "Medium Risk";
    responseData.overall_risk_detail = "This transaction is considered medium risk. Please review the details of this transaction.";
  } else if (responseData.overall_risk >= 0) {
    responseData.overall_risk_title = "Low Risk";
    responseData.overall_risk_detail = "This transaction is considered low risk. Please review the details of this transaction.";
  } 

  return responseData;
}


async function customFetch(url: URL, postBody: any, appId: string, timestamp: number, nonce: any, signatureFinal: any){
  const response = await fetch(url, {
    method: "POST", 
    mode: "cors", 
    cache: "no-cache", 
    credentials: "same-origin", 
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      "X-Signature-appid": appId,
      "X-Signature-timestamp": timestamp.toString(),
      "X-Signature-nonce": nonce,
      "X-Signature-signature": signatureFinal
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

// Parse transacting value to decimals to be human-readable
export function parseTransactingValue(transactionValue: any){ 
  const valueAsString = transactionValue.value?.toString()
  let valueAsDecimals = 0;
  if(valueAsString !== undefined){
    valueAsDecimals = parseInt(valueAsString, 16);
  }
  // Assumes 18 decimal places for native token
  valueAsDecimals = valueAsDecimals/1e18;

  return valueAsDecimals;
}

// Get native token of chain. If not specified, defaults to `ETH`
export function getNativeToken(chainId: string){
  let nativeToken = CHAINS_INFO[chainId]?.nativeToken;
  if(nativeToken == undefined){
    nativeToken = 'Native Tokens';
  }
  
  return nativeToken;
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