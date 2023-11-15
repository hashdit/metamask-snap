import InsightScreen from '../assets/snap-image.png';
import UrlScreen from '../assets/URL.png';
import ScreeningScreen from '../assets/ScreeningHighRisk.png';
import ScreeningAndUrlScreen from '../assets/ScreeningAndUrl.png';
import FunctionParamScreen from '../assets/FunctionParam.png';
import BscLogo from '../assets/BscLogoAlt.svg';
import EthLogo from '../assets/EthLogo.svg';
import HashDitBanner from '../assets/banner.png';
import HashDitGurad from '../assets/guard.png';
import WarningIcon from '../assets/warning.svg';

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
  padding-top:10rem;
  
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

const HeroLeftText = styled.div`
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


const BannerImg = styled.img<ImageProps>`
  width: 50%;
  margin-left: 5rem;
  animation: ${fadeInAndSlideFromBottom} 0.9s ease-in-out, ${hoverUpDown} 3s infinite ease-in-out;
`

const FunctionParamImg = styled.img<ImageProps>`
  width: 40%;
  border: 1.5px solid #80807d;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
`


const FeaturesHeading = styled.h1`
  font-size:60px;
  margin-top:15rem;
  position: relative;
  width:100%;
`

const FeaturesHeadingDescription = styled.h1`
  font-size:40px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  position: absolute;
  width: 80%;
  z-index: 1;

`

const InsightImg = styled.img<ImageProps>`
  width: 30%;
  height: 30%;
  // border: 1px solid #80807d;
  // border-radius: 7px;
  // box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
  filter: blur(5px);
  display: block; /* Ensures the image is centered within the container */
  margin: 0 auto; /* Centers the image horizontally */


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


const ScreeningImg = styled.img<ImageProps>`
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
`

const UrlImg= styled.img<ImageProps>`
  width: 40%;
  border: 1.5px solid #80807d;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
  animation: ${fadeInAndSlideFromLeft} 0.9s ease-in-out;
`

const Feature2 = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center; 
  width: auto;
  max-width: 1000px;
  min-width: auto;
  padding-bottom:100px;
  padding-top:100px;
`

const Feature2RightDiv  = styled.div`
  font-size: 28px;
  padding-left:100px;
  
`



const Feature3 = styled.div`
  width: auto;
  max-width: 1000px;
  min-width: auto;
  padding-bottom:100px;
  padding-top:100px;
`
const Feature3TopDiv  = styled.div`
  font-size: 35px;
  text-align:center;
  padding-bottom:5rem;

`

const Feature3BotDiv  = styled.div`
  display:flex;
  justify-content: center;
`



const Span = styled.span`
  color: #4169E1;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
  font-weight: 600;
`;

const BscLogoImg = styled.img<ImageProps>`
  width:200px;
  height:200px;
  padding-right:100px;
`

const EthLogoImg = styled.img<ImageProps>`
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
            <Span>HashDit Security</Span>
            for MetaMask
          </Heading>
          <HeroLeftText>
            Explore the power of HashDit Security and fortify your Metamask experience.
            
           </HeroLeftText>
           <HeroLeftText>
           Navigate the crypto space with <Span>confidence.</Span>
           </HeroLeftText>
        </HeroLeft>
        <BannerImg src={HashDitBanner} alt="Description of Image"/>
      </Hero>
      <FeaturesHeading> 
        <FeaturesHeadingDescription>
          Receive <Span>risk warnings</Span> and details whenever you interact with contracts or addresses that are known or suspected to be <Span>malicious</Span>, <Span>preventing</Span> the <Span>loss of funds</Span> before it happens.
        </FeaturesHeadingDescription>
        <InsightImg src={WarningIcon} alt="Description of Image"/>
      </FeaturesHeading>

      <Feature>
        <ScreeningImg src={ScreeningScreen} alt="Description of Image" style={{marginRight: '10rem', borderRadius: '7px'}} />
        <FeatureRightDiv>
          <Heading> 
          <Span>Hashdit</Span> Screening
          </Heading>
          HashDit API screening including transaction, destination address and url risk screening. (TODO:Change text)
        </FeatureRightDiv>
      </Feature>

      <Feature1>
        <Feature1LeftDiv>
          <Heading> 
          <Span>Url</Span>Screening
          </Heading>
            Screen Urls for phishing links and malicious websites. (TODO:Change text)
        </Feature1LeftDiv>
        <UrlImg src={UrlScreen} alt="Description of Image" style={{borderRadius: '7px'}} />
      </Feature1>

      <Feature2>
        <FunctionParamImg src={FunctionParamScreen} alt="Description of Image" style={{borderRadius: '7px'}} />
        <Feature2RightDiv>
          <Heading> 
            <Span>Transaction</Span>Insights
          </Heading>
          Transaction insights providing details of what function is being called and the parameters. (TODO:Change text)
        </Feature2RightDiv>
       
      </Feature2>

      <Feature3>
        <Feature3TopDiv>
          Full security screening support for BSC Mainnet and ETH Mainnet utilising the Hashdit API. (TODO:Change text)
        </Feature3TopDiv>
        <Feature3BotDiv>
          <BscLogoImg src={BscLogo} alt="Description of Image"/>
          <EthLogoImg src={EthLogo} alt="Description of Image"/>
        </Feature3BotDiv>
      </Feature3>




    </Container>
  );
};

export default Index;
