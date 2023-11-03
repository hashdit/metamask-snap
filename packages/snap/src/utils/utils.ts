import { remove0x } from '@metamask/utils';

import { v4 as uuidv4 } from 'uuid';
import * as CryptoJS from 'crypto-js';
import hmacSHA256 from "crypto-js/hmac-sha256";
import encHex from "crypto-js/enc-hex";
import { SUPPORTED_CHAINS } from "./chains";

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

  const url = new URL('https://cb.commonservice.io/security-api/public/app/v1/detect');
  url.searchParams.append("business", businessName);
  const query = url.search.substring(1);

  const timestamp = Date.now();
  const nonce = uuidv4().replace(/-/g, '');

  const dataToSign = `${appId};${timestamp};${nonce};POST;/security-api/public/app/v1/detect;${query};${JSON.stringify(postBody)}`;
  const signature = hmacSHA256(dataToSign, appSecret);
  const signatureFinal = encHex.stringify(signature);

  const response = await customFetch(url, postBody, appId, timestamp, nonce, signatureFinal);
  return formatResponse(response, businessName);
}


function formatResponse(resp: any, businessName: string){
  console.log("data: ", resp)
  let responseData: any = {
    overall_risk: -1,
    overall_risk_title: "Unknown Risk",
    overall_risk_detail: "No details",
    url_risk: -1,
    function_param1: "",
    function_param2: "",
    transaction_risk_detail: "N/A",
  };

  if (businessName == "hashdit_snap_tx_api_url_detection") {
    responseData.url_risk_level = resp.risk_level;

    const risk_details = JSON.parse(resp.risk_detail);
    responseData.url_risk_title = risk_details.name;
    responseData.url_risk_detail = risk_details.value;

  } else if (businessName == "hashdit_snap_tx_api_transaction_request") { // Need to add "addresses" risks
    if (resp.detection_result != null) {
      const detectionResults = resp.detection_result.risks;
      responseData.overall_risk = detectionResults.risk_level;

      responseData.function_name = resp.detection_result.function_name;
      if (responseData.function_name == "approve") {
        responseData.function_param1 = "name: " + resp.detection_result.params[0].name + ", type: " + resp.detection_result.params[0].type + ", value: " + resp.detection_result.params[0].value;
        responseData.function_param2 = "name: " + resp.detection_result.params[1].name + ", type: " + resp.detection_result.params[1].type + ", value: " + resp.detection_result.params[1].value;
      }

      interface TransactionRisk {
        risk_level: number;
        risk_detail: string;
      }
      const transactions: TransactionRisk[] = resp.detection_result.transaction;
      let highestRiskTransaction: TransactionRisk = transactions[0];
      for (const transaction of resp.detection_result.transaction) {
        if (transaction.risk_level > highestRiskTransaction.risk_level) {
          highestRiskTransaction = transaction;
          responseData.transaction_risk_detail = transaction.risk_detail;
        }
      }
      responseData.transaction_risk_detail = "Risk explanation: " + highestRiskTransaction.risk_detail;
      responseData.url_risk = detectionResults.url.risk_level;

      const risk_details = JSON.parse(detectionResults.url);
      responseData.url_risk_title = risk_details.name;
      responseData.url_risk_detail = risk_details.value;
    }
  }

  if (responseData.overall_risk >= 4) {
    responseData.overall_risk_title = "High Risk";
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
  let nativeToken = SUPPORTED_CHAINS[chainId]?.nativeToken;
  if(nativeToken == undefined){
    nativeToken = 'ETH';
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