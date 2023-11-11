import Insight from '../assets/snap-image.png';
import Url from '../assets/URL.png';
import Screening from '../assets/Screening.png';
import ScreeningAndUrl from '../assets/ScreeningAndUrl1.png';
import FunctionParam from '../assets/FunctionParam1.png';
import bscLogo from '../assets/BscLogo.svg';
import ethLogo from '../assets/EthLogo.svg';
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

const fadeInAndSlideFromRight = keyframes`
  from {
    transform: translateX(+50%);
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
  background: linear-gradient(0deg, #0f0f0f 50%, #1c1c1c);
  
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
    
  }
  
`;

const Hero = styled.div`
  display:flex;
  width: auto;
  max-width: 1000px;
  min-width: auto;

  align-items: center; 
  justify-content: center; 
  
`;

const HeroLeft = styled.div`


`

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


const hoverUpDown = keyframes`
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px); /* Adjust the value as needed for the hover distance */
  }
`

const InsightImage = styled.img<ImageProps>`
  width: 40%;
  margin-left: 10rem;
  animation: ${fadeInAndSlideFromBottom} 0.9s ease-in-out, ${hoverUpDown} 3s infinite ease-in-out;
  border: 1px solid #80807d;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
`

const FunctionParamImage = styled.img<ImageProps>`
  width: 40%;
  border: 1.5px solid #80807d;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
`


const FeaturesHeading = styled.h1`
  font-size:60px;
  margin-top:15rem;
`

const Feature = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center; 
  width: auto;
  max-width: 1000px;
  min-width: auto;
  padding-bottom:100px;
  padding-top:100px;
`


const ScreeningAndUrlImage = styled.img<ImageProps>`
  width: 40%;
  border: 1.5px solid #80807d;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
  animation: ${fadeInAndSlideFromLeft} 0.9s ease-in-out;
`

const FeatureRightDiv = styled.div`
  font-size: 28px;
  animation: ${fadeInAndSlideFromRight} 0.9s ease-in-out;
`
const Feature1 = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center; 
  width: auto;
  max-width: 1000px;
  min-width: auto;
  padding-bottom:100px;
  padding-top:100px;
`

const Feature1LeftDiv  = styled.div`
  font-size: 28px;
  padding-right:100px;
  
`


const Feature2 = styled.div`
  width: auto;
  max-width: 1000px;
  min-width: auto;
  padding-bottom:100px;
  padding-top:100px;
`
const Feature2TopDiv  = styled.div`
  font-size: 35px;
  text-align:center;
  padding-bottom:5rem;

`

const Feature2BotDiv  = styled.div`
  display:flex;
  justify-content: center;
`



const Span = styled.span`
  color: #19b2f2;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
  font-weight: 600;
`;

const BscLogoImage = styled.img<ImageProps>`
  width:200px;
  height:200px;
  padding-right:100px;
`

const EthLogoImage = styled.img<ImageProps>`
  width:200px;
  height:200px;
`


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
            <span>HashDit Security</span>
            for MetaMask
          </Heading>
          <HerorLeftText>
            Receive <Span>risk warnings</Span> and details whenever you interact with contracts or addresses that are known or suspected to be <Span>malicious</Span>, <Span>preventing</Span> the <Span>loss of funds</Span> before it happens.
          </HerorLeftText>
        </HeroLeft>
        <InsightImage src={Insight} alt="Description of Image" style={{marginLeft: '10rem', borderRadius: '7px'}} />
      </Hero>
      <FeaturesHeading> 
        Security Features  
      </FeaturesHeading>
        
      <Feature>
        <ScreeningAndUrlImage src={ScreeningAndUrl} alt="Description of Image" style={{marginRight: '10rem', borderRadius: '7px'}} />
        <FeatureRightDiv>
          <Heading> 
            Hashdit Screening
          </Heading>
          HashDit API screening including <Span>transaction</Span>, <Span>destination address</Span> and <Span>url risk screening</Span>.
        </FeatureRightDiv>
      </Feature>

      <Feature1>
        <Feature1LeftDiv>
          <Heading> 
            Transaction Insights
          </Heading>
          Transaction insights providing details of what <Span>function</Span> is being called and the <Span>parameters</Span>.
        </Feature1LeftDiv>
        <FunctionParamImage src={FunctionParam} alt="Description of Image" style={{borderRadius: '7px'}} />
     
        </Feature1>

      <Feature2>
        
        <Feature2TopDiv>
          Full security screening support for <Span>BSC Mainnet</Span> and <Span>ETH Mainnet</Span> utilising the <Span>HashDit API</Span> .
        </Feature2TopDiv>
        <Feature2BotDiv>
          <BscLogoImage src={bscLogo} alt="Description of Image"/>
          <EthLogoImage src={ethLogo} alt="Description of Image"/>
        </Feature2BotDiv>
    
      </Feature2>

    </Container>
  );
};

export default Index;
