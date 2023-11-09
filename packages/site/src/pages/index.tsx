import MyImage from '../assets/snap-image.png';
import { useContext } from 'react';
import styled from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  isLocalSnap,
} from '../utils';
import { defaultSnapOrigin } from '../config';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 5rem;
  margin-bottom: 4rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: #19b2f2;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
  font-weight: 600;
`;

const SmallHeading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.mobileHeading};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.text};
  font-weight: 400;
  margin-top: 0;
  margin-bottom: 5;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 100.0rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const SubtitleContainer = styled.div`
  flex: 1; // Take up the remaining space
  padding-right: 5rem; // Add some space between the text and the image
`;

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

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

  return (
    <Container>
      <Heading>
        Web3 insights from HashDit
      </Heading>
      <CardContainer>
        <SubtitleContainer>
          <Subtitle>
            Receive <Span>risk warnings</Span> and details whenever you interact with contracts or addresses that are known or suspected to be <Span>malicious</Span>, <Span>preventing</Span> the <Span>loss of funds</Span> before it happens.
          </Subtitle>
          <SmallHeading>
            Security Features
          </SmallHeading>
          <Subtitle>
            - HashDit API screening including <Span>transaction</Span>, <Span>destination address</Span> and <Span>url risk screening</Span>.
          </Subtitle>
          <Subtitle>
            - Transaction insights providing details of what <Span>function</Span> is being called and the <Span>parameters</Span>.
          </Subtitle>
          <Subtitle>
            - Information about the contract you're interacting with, such as <Span>deployment date</Span> and if it's <Span>code is verified</Span> on bscscan (for bsc contracts).
          </Subtitle>
        </SubtitleContainer>
        <img src={MyImage} alt="Description of Image" style={{ width: '50%', height: 'auto', marginLeft: '3rem', borderRadius: '20px' }} />
      </CardContainer>
    </Container>
  );
};

export default Index;
