# Ethereum Starter Pack | Remilia Corporation

**Date:** 2021-07-06
**Source:** https://blog.remilia.org/ethereum-starter-pack/

Ethereum Starter Pack

        

        

            
Jul 6, 2021

            
        

        

            

                
Step-by-step guide to getting started in Ethereum development and a survey of useful resources cobbled together from various other guides.

Recommended step-by-step:

Do introductory reading
 if new to the concepts of blockchain, smart contracts and decentralized finance.

Complete 
CryptoZombies walkthrough
 to learn solidity syntax and NFT concepts:

Do 
Solidity course on Chainshot
 to cement your understanding of smart contracts

Walkthrough building a full React dApp: 
Complete Guide to Full Stack ETH Development
 - 
Video Course

Familiarize yourself with 
Smart Contract security practices
 and run through 
Ethernaut hacking wargame
 to test your understanding.

Setup a comprehensive 
production stack

Now use your stack to build increasingly complex dApps without guardrails:

🚤 
Follow the full Ethereum Speed Run

🎟 
Create your first NFT

🥩 
Build a staking smart contract

🏵 
Deploy a token and vendor

🎫 
Extend the NFT example to make a “buyer mints” marketplace

🎲 
Learn about commit/reveal

✍️ 
Learn how ecrecover works

👩‍👩‍👧‍👧 
Build a multi-sig that uses off-chain signatures

⏳ 
Extend the multi-sig to stream ETH

⚖️ 
Learn how a simple DEX works

🦍 
Ape into learning!

Congratulations, you’re now an expert in the most lucrative & in-demand field in coding.

Resources

All resources are free and mainly from conversations in the 
CryptoDevHub community
 - their wiki is highly recommended for further resources. 
BuildGuidl
 is another very helpful developer community with a lot of resources on their site.

Understand

Introductory Crypto/Blockchain Reading list 
https://danromero.org/crypto-reading/

Introductory Crypto/Defi Reading list 
https://a16z.com/2018/02/10/crypto-readings-resources/

The Beigepaper which describes Ethereum and the Ethereum Virtual Machine (EVM) in an easy to understand way: 
https://github.com/chronaeon/beigepaper

Defi Report 
https://consensys.net/reports/defi-report-q1-2021/

How do Automated Market Makers work? 
https://medium.com/crypto-scribbles/how-do-automated-market-makers-work-1f25d0d48bc2

How does Compound work? 
https://medium.com/crypto-scribbles/how-does-compound-work-d2ef77ccf389

Resource Packs

DeFi Developer Road Map 
https://github.com/OffcierCia/DeFi-Developer-Road-Map

Ethereum dApp Development Guide and Wiki: 
https://wiki.cryptodevhub.io/ethereum-evm/getting-started

Know Ethereum 
https://knowethereum.com/

Entry Guides (Like this One)

CryptoDevHub getting Started from Scratch: 
https://cryptodevhub.io/wiki/blockchain-development-tutorial

How to Become a DeFi Developer 
https://defiweekly.substack.com/p/how-to-become-a-defi-developer

Joseph’s How to become an Ethereum Developer Guide: 
https://hackmd.io/@1LsqLgZ9SFyvmF1L1suBIw/dapp-dev

Buidl Guide: 
https://github.com/austintgriffith/scaffold-eth#-documentation

Tutorials

Interactive Tutorials

Solidity NFT Game Walkthrough: 
https://cryptozombies.io/

The Ethernaut - Solidity hacking wargame 
https://ethernaut.openzeppelin.com/

Blockchain: 
https://blockchaindemo.io/

dApp

Ultimate Ethereum Dapp Tutorial (How to Build a Full Stack Decentralized Application Step-By-Step 
https://www.dappuniversity.com/articles/the-ultimate-ethereum-dapp-tutorial

Full Stack dApp Development: 
https://dev.to/dabit3/the-complete-guide-to-full-stack-ethereum-development-3j13

Building a Dapp 
https://docs.openzeppelin.com/learn/building-a-dapp

Solidity

Learn Solidity in Y Minutes 
https://learnxinyminutes.com/docs/solidity/

Solidity by Example 
https://solidity-by-example.org/

Blockchain

Ethereum Blockchain Developer Guide 
https://ethereum-blockchain-developer.com/

Stacks

Scaffold Eth - Ethereum dev stack focused on fast product iterations 
https://github.com/austintgriffith/scaffold-eth

Money Legos - DeFi Stack 
https://github.com/studydefi/money-legos

OpenZeppelin - Secure Smart Contract Building Blocks 
https://github.com/OpenZeppelin/openzeppelin-contracts

Best Practices & Security

Best Practices for Smart Contract Development 
https://yos.io/2019/11/10/smart-contract-development-best-practices/

Ethereum Smart Contract Security Best Practices 
https://consensys.github.io/smart-contract-best-practices

Common Smart Contract vulnerabilities you might want to read through this article: 
https://yos.io/2018/10/20/smart-contract-vulnerabilities-and-how-to-mitigate-them/

Security Resouces 
https://wiki.cryptodevhub.io/ethereum-evm/security

Tips & Tools

Wiki: 
https://cryptodevhub.io/wiki/ethereum-virtual-machine-tools#ethereum-developer-tools-list
 Comprehensive list: 
https://github.com/ConsenSys/ethereum-developer-tools-list

Free Ethereum Gateway Hosting

Cloudflare offers a signup- and cost free hosted Ethereum Gateway –> 
https://developers.cloudflare.com/distributed-web/ethereum-gateway

All you need to do is use 
https://cloudflare-eth.com
 in your web3.js or ethers provider setup call. No signup, no API key. Just copy- and paste and you’re connected to mainnet.

You can use this as a replacement for Infura or Alchemy if you e.g. want to save API credits.

Multicall - Bundle Contract Calls to Reduce Load

Multicall by Maker is a real “hidden” gem. It bundles multiple constant contract calls to reduce load on the Ethereum Node / Ethereum Node Provider you’re using.

You can i.e. do 10 requests but they’re then combined into just 1. This helps you save API credits when you’re e.g. using Infura.

https://github.com/makerdao/multicall

You can use ethcall if you’re using ethers for a nice wrapper around multicall

https://github.com/Destiner/ethcall

Debug Smart Contract Reverts

If you ever get stuck with hard to debug Smart Contract reverts definitely check out the Tenderly Explorer: 
https://dashboard.tenderly.co/explorer

Simply paste in your failed transaction, hit enter and you’ll get an in-depth stack trace of everything that happened up during the point your transaction was reverted.

This saved me hours while working with more complex Smart Contract calls in the context of Flash Loans…

Walletlink - Extensionless Wallet Connection

If you’re looking for a simple way to connect your users wallets to your dApp without the requirement for browser extensions, you might want to take a look at WalletLink: 
https://github.com/walletlink/walletlink

Takes less than 5 minutes and 15 lines of code to setup

Gas Optimization Resources

https://betterprogramming.pub/how-to-write-smart-contracts-that-optimize-gas-spent-on-ethereum-30b5e9c5db85

https://eattheblocks.com/how-to-optimize-gas-cost-in-a-solidity-smart-contract-6-tips/

https://www.researchgate.net/publication/340300470_Design_Patterns_for_Gas_Optimization_in_Ethereum

Docs

Solidity 
https://docs.soliditylang.org/

Web3js 
https://web3js.readthedocs.io/

            

        

        

        

            Tags: 
Guide

        

        

            Permalink: 
https://blog.remilia.org/ethereum-starter-pack/
