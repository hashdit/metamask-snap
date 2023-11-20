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


import { useContext , useEffect } from 'react';
import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { MetamaskActions, MetaMaskContext } from '../hooks';
import {
  connectSnap,
  getSnap,
  isLocalSnap,
} from '../utils';
import { defaultSnapOrigin } from '../config';
import {HeaderButtons} from '../components/Buttons'


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
  //background: linear-gradient(0deg,#0f0f0f 50%,#1c1c1c);

  
  ${({ theme }) => theme.mediaQueries.small} {
    
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
    
  }
  
`;

// const Hero = styled.div`
//   display:flex;
//   width: auto;
//   max-width: 1000px;
//   min-width: auto;
//   padding-top:10rem;

// `;

const Hero = styled.div`
  padding:60px;

`;

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr; /* Two columns with equal width */
  gap: 50px; /* Adjust the gap between the items */
  max-width: 1000px;
  
  @media (max-width: 1000px) {
    display:flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;
  }
`;

const HeroLeft = styled.div`
  width: auto;
  max-width: 500px;
  min-width: auto;
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
  width: 100%;
  animation: ${fadeInAndSlideFromBottom} 0.9s ease-in-out, ${hoverUpDown} 3s infinite ease-in-out;
`
const FeaturesHeading = styled.h1`

  width:100%;

`

const FeaturesHeadingDiv = styled.h1`
  font-size:60px;
  padding-top:5rem;
  padding-bottom:5rem;
  position: relative;
  width:100%;
  margin:0;
`

const FeaturesHeadingDivDescription = styled.h1`
  font-size:40px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  position: absolute;
  width: 75%;
  z-index: 1;
  @media (max-width: 1000px) {
    font-size:20px;
  }

`

const WarningImg = styled.img<ImageProps>`
  width: 30%;
  height: 30%;
  filter: blur(2px);
  display: block;
  margin: 0 auto; 
`

const Feature = styled.div`
  padding:60px;
  margin-bottom:100px;
`


const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  max-width: 1000px;
  align-items: center;

  @media (max-width: 1000px) {
    display: flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;

    > * {
      order: 1;
    }

    > :first-child {
      order: 2;
    }
  }
`;

const ScreeningImg = styled.img<ImageProps>`
  width: 100%;
  border: 1.5px solid #80807d;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
  animation: ${fadeInAndSlideFromLeft} 0.9s ease-in-out;
  border-radius:7px;
  @media (max-width: 1000px) {
    max-width:500px;
  }
`
    

const FeatureRightDiv = styled.div`
  width: auto;
  max-width: 500px;
  min-width: auto;
  font-size:28px;
`


const Feature1 = styled.div`
  padding:60px;
  margin-bottom:100px;
`
const Feature1Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  max-width: 1000px;
  align-items: center;
  @media (max-width: 1000px) {
    display:flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;

  }
`
const Feature1LeftDiv  = styled.div`
  width: auto;
  max-width: 500px;
  min-width: auto;
  font-size:28px;
`

const UrlImg= styled.img<ImageProps>`
  width: 100%;
  border: 1.5px solid #80807d;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
  animation: ${fadeInAndSlideFromLeft} 0.9s ease-in-out;
  border-radius:7px;
  @media (max-width: 1000px) {
    max-width:500px;
  }
`

const Feature2 = styled.div`
  padding:60px;
`
const Feature2Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 50px;
  max-width: 1000px;
  align-items: center;
  @media (max-width: 1000px) {
    display:flex;
    flex-flow: column;
    justify-content: center;
    align-items: center;
    

  }
`
const FunctionParamImg = styled.img<ImageProps>`
  width: 100%;
  border: 1.5px solid #80807d;
  box-shadow: 0 2px 4px rgba(255, 255, 255, 0.1), 0 4px 8px rgba(255, 255, 255, 0.2);
  border-radius:7px;
  @media (max-width: 1000px) {
    max-width:500px;
  }
`

const Feature2RightDiv  = styled.div`
  width: auto;
  max-width: 500px;
  min-width: auto;
  font-size:28px;
`



const Feature3 = styled.div`
  
`

const Feature3TopDiv  = styled.div`
  // font-size: 20px;
  text-align:center;
  padding-bottom:5rem;
  width: auto;
  max-width: 1000px;
  min-width: auto;
  font-size:28px;

`

const Feature3BotDiv  = styled.div`
  display:flex;
  justify-content: center;
`

const Span = styled.span`
  color: ${(props) => (props.theme.colors.text.alternative)};
  font-weight: 600;
`;

const BscLogoImg = styled.img<ImageProps>`
  width: 15%;
  padding-right:10%;
  @media (max-width: 1000px) {
    max-width:500px;
    width:20%;
  }
  
`

const EthLogoImg = styled.img<ImageProps>`
  width: 10%;
  @media (max-width: 1000px) {
    max-width:500px;
    width:15%;
  }
`


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

      <Hero>
        <HeroGrid>
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
        </HeroGrid>
      </Hero>

      <FeaturesHeading>
        <FeaturesHeadingDiv> 
          <FeaturesHeadingDivDescription>
            Receive <Span>risk warnings</Span> and details whenever you interact with smart contracts or addresses that are known or suspected to be <Span>malicious</Span>, <Span>preventing</Span> the <Span>loss of funds</Span> before it happens.
          </FeaturesHeadingDivDescription>
          <WarningImg src={WarningIcon} alt="Description of Image"/>
        </FeaturesHeadingDiv>
      </FeaturesHeading>

      <Feature>
        <FeatureGrid>
          <ScreeningImg src={ScreeningScreen} alt="Description of Image" />
          <FeatureRightDiv>
            <Heading> 
            <Span>Transaction</Span> Screening
            </Heading>
            Gain insights into the risk level of each transaction. Receive timely warnings before engaging with potentially vulnerable or malicious smart contracts.
          </FeatureRightDiv>
        </FeatureGrid>
      </Feature>

      <Feature1>
        <Feature1Grid>
          <Feature1LeftDiv>
            <Heading> 
            <Span>URL Risk</Span> Information
            </Heading>
            Protect yourself from phishing links and malicious websites by leveraging our advanced URL screening capabilities. 
          </Feature1LeftDiv>
          <UrlImg src={UrlScreen} alt="Description of Image"/>
        </Feature1Grid>
      </Feature1>

      <Feature>
        <FeatureGrid>
          <ScreeningImg src={FunctionParamScreen} alt="Description of Image"/>
          <FeatureRightDiv>
            <Heading> 
              <Span>FunctionCall</Span> Insights
            </Heading>
            Understand precisely which function is being called and the parameters it receives during smart contract interactions.
          </FeatureRightDiv>
        </FeatureGrid>
      </Feature>

      <Feature3>
        <Feature3TopDiv>
          <Heading> 
              <Span>Binance Smart Chain & Ethereum</Span>
          </Heading>
          Full security screening support for BSC Mainnet and ETH Mainnet.
        </Feature3TopDiv>
        <Feature3BotDiv>
          <BscLogoImg src={BscLogo} alt="Description of Image"/>
          <EthLogoImg src={EthLogo} alt="Description of Image"/>
        </Feature3BotDiv>
      </Feature3>

  
      <HeaderButtons state={state} onConnectClick={handleConnectClick} />
    </Container>
  );
};

export default Index;
