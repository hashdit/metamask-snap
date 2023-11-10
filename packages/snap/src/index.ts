import type { OnTransactionHandler } from '@metamask/snaps-types';
import { heading, panel, text, copyable, divider } from '@metamask/snaps-ui';
import { hasProperty } from '@metamask/utils';
import { getHashDitResponse, parseTransactingValue, getNativeToken } from "./utils/utils";
import { CHAINS_INFO } from "./utils/chains";


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
    // Current chain is not BSC. Display not supported text.
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
      const respData = await getHashDitResponse("hashdit_native_transfer", transactionOrigin, transaction, chainId);
      console.log("respData: ", respData);

      // We also need to add seperate URL screening, as the native transfer hashdit endpoint doesnt have url screening
      const urlRespData = await getHashDitResponse( "hashdit_snap_tx_api_url_detection", transactionOrigin);
      console.log("urlRespData: ", urlRespData);
      
      const transactingValue = parseTransactingValue(transaction.value);
      const nativeToken = getNativeToken(chainId);

      let contentArray: any[] = [];

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

      // We should try to make this smaller somehow
      contentArray.push(
        heading('HashDit Trace-ID'),
        text(`${respData.trace_id}`),
      );

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
  // Current chain is not BSC. Only perform URL screening
  if(chainId !== '0x38' && chainId !== '0x1'){
    const urlRespData = await getHashDitResponse( "hashdit_snap_tx_api_url_detection", transactionOrigin);
    console.log("urlRespData: ", urlRespData);

    let contentArray: any[] = [      
    ];

    contentArray.push(  
      heading('URL Risk Information'),
      text(`The URL **${transactionOrigin}** has a risk of **${urlRespData.url_risk}**`),
      divider(),
      text("HashDit Security Insights is not fully supported on this chain. Only URL screening has been performed."),
      text("Currently we only support the **BSC Mainnet** and **ETH Mainnet**."),
    );

    const content = panel(contentArray);
    return { content };
    
  }
  // Current chain is BSC. Perform smart contract interaction insights
  else{
    const respData = await getHashDitResponse("hashdit_snap_tx_api_transaction_request", transactionOrigin, transaction, chainId);
    console.log("respData: ", respData);

    let contentArray = [
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
  
    // We should try to make this smaller somehow
    contentArray.push(
      heading('HashDit Trace-ID'),
      text(`${respData.trace_id}`),
    );
    
    const content = panel(contentArray);
    return { content };
  }

};