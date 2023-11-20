import type { OnTransactionHandler, OnRpcRequestHandler, JsonRpcRequest, JsonRpcParams } from '@metamask/snaps-types';
import { heading, panel, text, copyable, divider } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';
import { getHashDitResponse, parseTransactingValue, getNativeToken } from "./utils/utils";
import { extractPublicKeyFromSignature } from './utils/cryptography';
import { CHAINS_INFO } from "./utils/chains";

export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) => {
  switch (request.method) {
    case 'publicKeyMethod':
      console.log(origin);
      // Check the origin url calling the method is the offical Hashdit website
      // Otherwise, a malicious user could call this method with a signature + message from an address they do not own to impersonate them.
      // Todo: Change the URL later
      if (origin !== "http://localhost:8000") {
        throw new Error("Unknown website calling `onRpcRequest`. Please only use the official Hashdit snap website.");
      }

      const publicKey = extractPublicKeyFromSignature(request.params.message, request.params.signature);
      console.log('Public key:', publicKey);
      
      try {
        // Save public key here and user address here:
        await snap.request({
          method: 'snap_manageState',
          params: {
            operation: 'update',
            newState: { 
              publicKey: publicKey,
              userAddress: request.params.from
            },
          },
        });
        console.log('Public key & user address saved');
      } catch (error) {
        console.error('Error saving public key and user address:', error);
      }

      // Retrieve for testing
      try {
        const persistedData = await snap.request({
          method: 'snap_manageState',
          params: { operation: 'get' },
        });
      
        console.log('persistedData(PublicKey):', persistedData.publicKey);
        console.log('persistedData(address):', persistedData.userAddress);
      } catch (error) {
        console.error('Error retrieving persisted data:', error);
      }
      
    return true;

    default:
      console.error(`Method ${request.method} not defined.`);
  }
};


// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction, transactionOrigin }) => {
  /** 
   *Transaction is a native token transfer. Only check if current chain is supported since the transfer will not interact with a URL.
   *The key `type` in object `transaction` only exists in smart contract interactions and not native transfers.
   *We can use this to determine the type of transaction (native transfer or contract interaction).
   */ 

  if (transaction.hasOwnProperty('type')) {
    
    const chainId = await ethereum.request({ method: "eth_chainId" });
    // Check if chainId is undefined or null
    if (typeof chainId !== 'string') {
      const contentArray: any[] = [
        heading("HashDit Security Insights"),
        text(`Error: ChainId could not be retreived (${chainId})`)
      ]
      const content = panel(contentArray);
      return { content };
    }
    // Current chain is not BSC and not ETH. Display not supported text.
    if(chainId !== '0x38' && chainId !== '0x1'){
      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);
      
      let contentArray: any[] = [ 
        heading('Transfer Details'),
        text(`You are transfering **${transactingValue}** **${nativeToken}** to **${transaction.to}**`),
        divider(),
      ];

      if(CHAINS_INFO.hasOwnProperty(chainId)){
        const explorerURL = CHAINS_INFO[chainId].url;
        contentArray.push(
          heading(`View Destination Address On Explorer`),
          copyable(`${explorerURL}${transaction.to}`),
          divider(),
        )
      }
      
      contentArray.push(       
        text("HashDit Security Insights is not fully supported on this chain."),
        text("Currently we only support the **BSC Mainnet** and **ETH Mainnet**."),
      )
      
      const content = panel(contentArray);
      return { content };
    }
    // Current chain is supported. Display token transfer insights
    else{
      // Retrieve saved user's public key to make HashDit API call
      const persistedUserPublicKey = await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      })

      let contentArray: any[] = [];
      var respData;
      var urlRespData;
      if(persistedUserPublicKey !== null){
        respData = await getHashDitResponse("hashdit_native_transfer", persistedUserPublicKey, transactionOrigin, transaction, chainId,);
        console.log("respData: ", respData);
  
        // We also need to add seperate URL screening, as the native transfer hashdit endpoint doesnt have url screening
        urlRespData = await getHashDitResponse( "hashdit_snap_tx_api_url_detection", persistedUserPublicKey, transactionOrigin);
        console.log("urlRespData: ", urlRespData);

        if (respData.overall_risk_title != "Unknown Risk") {
          contentArray = [
            heading('HashDit Transaction Screening'),
            text(`Overall risk: **${respData.overall_risk_title}**`),
            text(`Risk Overview: **${respData.overall_risk_detail}**`),
            text(`Risk Details: **${respData.transaction_risk_detail}**`),
            divider(),
          ];
        } else {
          contentArray = [
            heading('HashDit Transaction Screening'),
            text(`Overall risk: **${respData.overall_risk_title}**`),
            divider(),
          ];
        }

        contentArray.push(
          heading('URL Risk Information'),
        );
    
        if (urlRespData.url_risk >= 2) {
          contentArray.push( 
            text(`**${urlRespData.url_risk_title}**`));
        }
        contentArray.push(
          text(`The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`),
          divider(),
        );
      }
      else{
        contentArray.push(
          heading('HashDit Security Insights'),
          text('⚠️ The full functionality of HashDit is not working. ⚠️'),
          text('To resolve this issue, please follow these steps:'),
          text("_(1) Click on the 'Setup Signature' button on the HashDit website._"),
          text("_(2) Confirm your identity by approving the provided message._"),
          divider(),
        );
      }

      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);

      contentArray.push(
        heading('Transfer Details'),
        text(`You are transfering **${transactingValue}** **${nativeToken}** to **${transaction.to}**`),
        divider()
      );

      if(CHAINS_INFO[chainId].url){
        const explorerURL = CHAINS_INFO[chainId].url;
        contentArray.push(
          heading(`View Destination Address On Explorer`),
          copyable(`${explorerURL}${transaction.to}`),
          divider(),
        )
      }

      if(respData !== undefined){
        contentArray.push(
          heading('HashDit Trace-ID'),
          text(`${respData.trace_id}`),
        );
      }

      const content = panel(contentArray);
      return { content };
    }
  }
  
  // Transaction is an interaction with a smart contract because key `type` was found in object `transaction`
  const chainId = await ethereum.request({ method: "eth_chainId"});
  // Check if chainId is undefined or null
  if (typeof chainId !== 'string') {
    const contentArray: any[] = [
      heading("HashDit Security Insights"),
      text(`Error: ChainId could not be retreived (${chainId})`)
    ]
    const content = panel(contentArray);
    return { content };
  }
  // Current chain is not BSC and not ETH. Only perform URL screening
  if(chainId !== '0x38' && chainId !== '0x1'){
    // Retrieve saved user's public key to make HashDit API call
    const persistedUserPublicKey = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    })

    let contentArray: any[] = [];
    if(persistedUserPublicKey !== null){
      const urlRespData = await getHashDitResponse( "hashdit_snap_tx_api_url_detection", persistedUserPublicKey, transactionOrigin);
      console.log("urlRespData: ", urlRespData);

      contentArray = [
        heading('URL Risk Information'),
        text(`The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`),
        divider(),
        text("HashDit Security Insights is not fully supported on this chain. Only URL screening has been performed."),
        text("Currently we only support the **BSC Mainnet** and **ETH Mainnet**."),
      ];
    }
    else{
      contentArray = [
        heading('HashDit Security Insights'),
        text('⚠️ The full functionality of HashDit is not working. ⚠️'),
        text('To resolve this issue, please follow these steps:'),
        text("_(1) Click on the 'Setup Signature' button on the HashDit website._"),
        text("_(2) Confirm your identity by approving the provided message._"),
        divider(),
        text("HashDit Security Insights is not fully supported on this chain. Only URL screening has been performed."),
        text("Currently we only support the **BSC Mainnet** and **ETH Mainnet**."),
      ];
    }

    const content = panel(contentArray);
    return { content };
    
  }
  // Current chain is BSC. Perform smart contract interaction insights
  else{
    // Retrieve saved user's public key to make HashDit API call
    const persistedUserPublicKey = await snap.request({
      method: 'snap_manageState',
      params: { operation: 'get' },
    })

    let contentArray: any[] = [];
    if(persistedUserPublicKey !== null){
      const respData = await getHashDitResponse("hashdit_snap_tx_api_transaction_request", persistedUserPublicKey, transactionOrigin, transaction, chainId);
      console.log("respData: ", respData);
    
  
      contentArray = [
        heading('HashDit Transaction Screening'),
        text(`**Overall risk:** _${respData.overall_risk_title}_`),
        text(`**Risk Overview:** _${respData.overall_risk_detail}_`),
        text(`**Risk Details:** _${respData.transaction_risk_detail}_`),
        divider(),
      ];

      contentArray.push(
        heading('URL Risk Information'),
      );

      if (respData.url_risk >= 2) {
        contentArray.push( 
          text(`**${respData.url_risk_title}**`));
        }

      contentArray.push(
        text(`The URL **${transactionOrigin}** has a risk of **${respData.url_risk}**`),
        divider(),
      );

      // Display function name and parameters
      if (respData.function_name !== "") {
        contentArray.push(
          heading(`Function Name: ${respData.function_name}`),
        );
        // Loop through each function parameter and display its values
        for (const param of respData.function_params){
          contentArray.push( 
            text(`**Name:** _${param.name}_`),
            text(`**Type**: _${param.type}_`),
            text(`**Value:** _${param.value}_`),
            divider()
          );
        }
      }
    
      contentArray.push(
        heading('HashDit Trace-ID'),
        text(`${respData.trace_id}`),
      );
    }
    else{
      // User public key not found, display error message to snap
      contentArray = [
        heading('HashDit Security Insights'),
        text('⚠️ The full functionality of HashDit is not working. ⚠️'),
        text('To resolve this issue, please follow these steps:'),
        text("_(1) Click on the 'Setup Signature' button on the HashDit website._"),
        text("_(2) Confirm your identity by approving the provided message._"),
      ];
    }
    
    const content = panel(contentArray);
    return { content };
  }

};