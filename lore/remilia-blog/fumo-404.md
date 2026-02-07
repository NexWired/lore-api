# Milady $FUMO Redux: $FUMO404 Hard Fork | Remilia Corporation

**Date:** 2024-04-30
**Source:** https://blog.remilia.org/fumo-404/

Milady $FUMO Redux: $FUMO404 Hard Fork

        

        

            
Apr 30, 2024

            
        

        

            

                
Milady Fumo 404 / $FUMO404:

ERC-721: 
0x5751c59e5cd4b11cd2521a7dcfe7f3ba135b0413

ERC-20: 
0x60c19ef883c94be612d9d58e7becd3bc1d29442c

NOTE: This is a hard fork of the 
compromised original collection
. The original should be treated as no longer valid due to the risk of a mass mint.

            

                

                

                    

                        

                            

                        

                    

                

                

                    

                        

                            

                                

                            

                        

                        

                            

                                

                                

                            

                        

                        
0:00

                        

                            /
0:06

                        

                        

                        
1×

                        

                            

                                

                            

                        

                        

                            

                                

                            

                        

                        

                    

                

            

            
        

Refresher

Drawing inspiration from 
Uniswap's Unisocks
 project, Remilia launched a $FUMO ERC-20 token with identical mechanics to release a special collectable physical Milady Fumo. This token operated on a Uniswap v2 bonding curve backed by ETH liquidity provided by Remilia. Users could buy from or sell to the curve, or they could burn whole $FUMO tokens to redeem two special Milady Fumo Baby NFTs and, until October 31 2023, a redemption ticket for a physical Megasize Alien Milady Fumo. 

As the main redemption window for the physical Fumo closed, it was decided to keep the liquidity pool and redemptions for the NFTs open so trading could continue based on audience feedback. However, on March 16th, 2024 Remilia's owning wallets were compromised and treasury assets were removed by an attacker. The attacker pulled the $FUMO liquidity from Uniswap preventing liquid trading and further threatening a mass mint of the Fumo NFT's, rendering the Milady Fumo NFT at risk.

Our Fix

After the attacker drained $FUMO liquidity, risking a mass mint attack on the NFT, the solution was to deploy a new canonical Milady Fumo NFT, and forcibly-redeem all $FUMO tokens into the corresponding Fumo NFTs, minus the hacker's own, essentially forking the collection out of the hacker's hands.

But what about users who held fractional amounts of $FUMO token? To solve this, we deployed the new NFT as a self-fractionalizing NFT, on the "404" model, based off of 
Vectorized's DN404 contract
. 

This contract produces an asset that can be traded as both an ERC-20 fungible token and an ERC-721 NFT. Whenever a user obtains one whole unit of the ERC-20 token, an ERC-721 NFT is minted for them. Whenever a user trades away one of the ERC-721 NFTs, a whole unit of the ERC-20 token is also transferred. The two assets are inseparably intertwined and can be traded on either NFT marketplaces or ERC-20 token exchanges.

The 
new Fumo DN404 contract
 is live; new versions of all original Alien Fumo Baby NFTs have been airdropped to their owners as Milady Fumo Baby 404 NFTs, ticker $FUMO404. $FUMO404 token holders have been airdropped twice the amount of $FUMO404 to account for the old conversion of one token to two NFTs. 

The snapshot was taken today covering top 250 $FUMO404 token holders were airdropped as holders below this threshold was effectively dust (<0.02 $FUMO), minus 
the hacker's address
.

Silver Lining

This new 404 model further unifies the liquid nature of the token and the NFT into a single contract, better achieving the original goal in keeping redemptions open past the close of the physical Fumo window as an experimental combination of token and NFT mint. It is airdropped 100% to $FUMO and Milady Fumo Baby NFT holders as a fork on the original collection, upgrading the project and preventing the vulnerability created by the Remilia hack, while allowing it to continue as a fully community-owned project (as promised, Remilia did not give itself any $FUMO404 tokens).

Remilia also took the opportunity to use this migration to address feedback from the community about art on the Fumo NFTs with some 3D assets having clipping errors. A special bloody overlay has also been applied to 25% of newly minted FUMO's force minted following the hack to commemorate the lore of the 3/16 hack, and provide another rarity element to the collection.

Remilia's 
general strategy for Milady Fumo NFT
 to be rigged as a metaverse and VTube-ready, interoperable model continues as planned; and physical Alien Milady Fumo dolls are currently being prototyped and going through quality review, we expect them to be delivered this summer.

Join the Milady Village discord for Fumo discussion, OTC trading channels and updates: 
discord.gg/milady

            

        

        

        

            Tags: 
NFT

        

        

            Permalink: 
https://blog.remilia.org/fumo-404/
