# HashDit Security for MetaMask

Explore the power of HashDit Security and fortify your MetaMask experience. Navigate the crypto space with confidence.

## Features

Receive risk warnings and details whenever you interact with smart contracts or addresses that are known or suspected to be malicious, preventing the loss of funds before it happens.

### Address Poisoning

Check for similarities between all of the user's addresses and the addresses they are interacting with. If any similarity is detected, a warning will be displayed to the user.

### Transaction Screening

Gain insights into the risk level of each transaction. Receive timely warnings before engaging with potentially vulnerable or malicious smart contracts.

### URL Risk Information

Protect yourself from phishing links and malicious websites by leveraging our advanced URL screening capabilities.

### FunctionCall Insights

Understand precisely which function is being called and the parameters it receives during smart contract interactions.

### Binance Smart Chain & Ethereum Support

Full security screening support for BSC Mainnet and ETH Mainnet.

## Running instructions

Ensure you have metamask flask installed: https://metamask.io/flask/

1. After making changes, run "yarn install" to install any new dependencies.
2. Run "yarn start" to launch two development servers, one for watching and compiling Snap, the other for the React site.
3. Navigate to http://localhost:8000 to view the site.
4. Install the snap by following instructions on the site.
5. Initiate transactions using MetaMask and click on the 'Hashdit security' tab on the transaction approval page. This will execute the snap code and return risk details.
