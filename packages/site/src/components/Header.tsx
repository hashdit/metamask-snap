import { useContext } from 'react';
import styled, { useTheme } from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import { connectSnap, getThemePreference, getSnap } from '../utils';
import { HeaderButtons } from './Buttons';
import { SnapLogo } from './SnapLogo';
import { HashDitNameLogo } from './HashDitName';
import { Toggle } from './Toggle';
import { defaultSnapOrigin } from '../config';

const HeaderWrapper = styled.header`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 2.4rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.border.default};
`;

const Title = styled.p`
  font-size: ${(props) => props.theme.fontSizes.title};
  font-weight: bold;
  margin: 0;
  margin-left: 1.2rem;
  ${({ theme }) => theme.mediaQueries.small} {
    display: none;
  }
`;

const LogoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const RightContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const Header = ({
  handleToggleClick,
}: {
  handleToggleClick(): void;
}) => {
  const theme = useTheme();
  const [state, dispatch] = useContext(MetaMaskContext);

  const handleConnectClick = async () => {
    try {
      await connectSnap();
      const installedSnap = await getSnap();

      dispatch({
        type: MetamaskActions.SetInstalled,
        payload: installedSnap,
      });
    } catch (e) {
      console.error(e);
      dispatch({ type: MetamaskActions.SetError, payload: e });
    }
  };
  const onSignatureClick = async () => {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
  
      // Get user's public key
      // Reference: https://docs.metamask.io/wallet/reference/eth_getencryptionpublickey/
      const encryptionPublicKey = await window.ethereum.request({
        method: 'eth_getEncryptionPublicKey',
        params: [address],
      });
      console.log('Encryption Public Key:', encryptionPublicKey)
      
      // Send the signature to the snap for processing
      const result = await window.ethereum.request({
        method: 'wallet_invokeSnap',
        params: {
          snapId: defaultSnapOrigin, // Replace with your actual Snap ID
          request: {
            method: 'publicKeyMethod',
            params:{        
              publicKey: encryptionPublicKey,
            }
          }
        }
      });
      console.log("SnapResult: ", result);
      // Alternative Method:
      
      // const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      // const from = accounts[0];  
      // const message = "Please sign this message to confirm your identity.";
      // const signature = await window.ethereum.request({
      //     method: 'personal_sign',
      //     params: [message, from],
      //   });
      //   console.log('signed', signature)
      // const result = await window.ethereum.request({
      //   method: 'wallet_invokeSnap',
      //   params: {
      //     snapId: defaultSnapOrigin, // Replace with your actual Snap ID
      //     request: {
      //       method: 'publicKeyMethod',
      //       params:{        
      //         key1: message,
      //         key2: signature,},
      //     }
      //   }
      // });


      
    } catch (error) {
      console.error('Error requesting accounts or encryption public key:', error);
    }
  };
  return (
    <HeaderWrapper>
      <LogoWrapper>
        <HashDitNameLogo color={theme.colors.icon.default} size={200} />
      </LogoWrapper>
      <RightContainer>
        <Toggle
          onToggle={handleToggleClick}
          defaultChecked={getThemePreference()}
        />
        <HeaderButtons state={state} onConnectClick={handleConnectClick} onSignatureClick={onSignatureClick} />
      </RightContainer>
    </HeaderWrapper>
  );
};
