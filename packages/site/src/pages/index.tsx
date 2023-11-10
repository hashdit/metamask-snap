import MyImage from '../assets/snap-image.png';
import { useContext } from 'react';
import styled, { keyframes } from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  isLocalSnap,
} from '../utils';
import { defaultSnapOrigin } from '../config';

interface ImageProps {
  alt: string;
  src: string;
}

const fadeInAndSlideFromBottom = keyframes`
  from {
    transform: translateY(+50%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
}
`;

const fadeInAndSlideFromLeft = keyframes`
  from {
    transform: translateX(-50%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding-top: 5rem;
  padding-bottom: 4rem;
  
  
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
    
  }
  
`;
//background: linear-gradient(0deg, #0f0f0f 50%, #1c1c1c);
const Hero = styled.div`
  display:flex;
  width: auto;
  max-width: 1000px;
  min-width: auto;
  align-self: center;
 
`;

const HeroLeft = styled.div``

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: left;
  font-size:60px;
  span {
    display: block;

  }
  animation: ${fadeInAndSlideFromLeft} 0.9s ease-in-out;
 
`;

const HerorLeftText = styled.div`
  font-size:28px;
  animation: ${fadeInAndSlideFromLeft} 0.9s ease-in-out;
`

const InsightImage = styled.img<ImageProps>`
  width: 40%;
  marginLeft: 10rem;
  animation: ${fadeInAndSlideFromBottom} 0.9s ease-in-out;
`


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
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Index = () => {
  const [state, dispatch] = useContext(MetaMaskContext);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? state.isFlask
    : state.snapsDetected;

  return (
    <Container>
      <Hero>
        <HeroLeft>
          <Heading> 
            <span>HashDit Security </span>
            for MetaMask
          </Heading>
          <HerorLeftText>
            Receive <Span>risk warnings</Span> and details whenever you interact with contracts or addresses that are known or suspected to be <Span>malicious</Span>, <Span>preventing</Span> the <Span>loss of funds</Span> before it happens.
          </HerorLeftText>
        </HeroLeft>
        <InsightImage src={MyImage} alt="Description of Image" style={{marginLeft: '10rem', borderRadius: '20px'}} />
      </Hero>
      <CardContainer>
        <SubtitleContainer>
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
            - Full security screening support for <Span>BSC Mainnet</Span> and <Span>ETH Mainnet</Span> utilising the <Span>HashDit API</Span> .
          </Subtitle>
        </SubtitleContainer>
         </CardContainer>
    </Container>
  );
};

export default Index;
