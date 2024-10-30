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

    // try {
    //   // Request user to sign a message -> get user's signature -> get user's public key.
    //   const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    //   const from = accounts[0];  
    //   const message = `Hashdit Security: ${from}, Please sign this message to authenticate the HashDit API.`;
    //   const signature = await window.ethereum.request({
    //       method: 'personal_sign',
    //       params: [message, from],
    //     });
        
    //   // Send the signature to the snap for processing
    //   const result = await window.ethereum.request({
    //     method: 'wallet_invokeSnap',
    //     params: {
    //       snapId: defaultSnapOrigin, // Replace defaultSnapOrigin with 'npm:hashdit-snap-security' to test live version of snap
    //       request: {
    //         method: 'publicKeyMethod',
    //         params:{        
    //           signature: signature,
    //           message: message,
    //           from: from
    //         }
    //       }
    //     }
    //   });
    // } catch (error) {
    //   console.log(`Error requesting accounts or encrypting public key: ${error}`);
    // }
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
        <HeaderButtons state={state} onConnectClick={handleConnectClick}/>
      </RightContainer>
    </HeaderWrapper>
  );
};
