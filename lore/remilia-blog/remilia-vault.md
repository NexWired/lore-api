# Remilia New Vault Architecture | Remilia Corporation

**Date:** 2024-04-30
**Source:** https://blog.remilia.org/remilia-vault/

Remilia New Vault Architecture

        

        

            
Apr 30, 2024

            
        

        

            

                
Introduction

The Remilia Vault Visualizer

On March 16th, 2024, Remilia's externally-owned accounts (EOAs) and multisignature treasury were compromised by an attacker. The root vulnerability exploited by the attack was access centralization on the CEO's devices, which were likely compromised by malware (see: 
post-mortem
). In reponse, Remilia has commissioned a highly robust tripartite dual-multisig new architecture for on-chain management, designed to not only address the specific failures in the previous security setup but appropriately hardened to sustain a thousand year dynasty, detailed below.

New Official Addresses

Effectively immediately, Remilia official on-chain addresses now consist of two multisignatory vaults maintained on Gnosis Safe smart contracts and a third evacuation vault stored on a hard wallet:

[Primary] - Remilia Vault A (RV-A): 0x7578425460C842CA077544FFe224Cf213c931241

[Secondary] - Remilia Vault B (RV-B): 0x0717e5e7b89523efc47B5E085199D9e2C955EA93

[Emergency] - Cold Vault (RV-C): 0xEF07C6D677B69ce2F467044B4aDe1285e4ccb170

Address Description

The first address (RV-A) can be effectively treated as Remilia's Official Public Address for community purposes. The secondary vault (RV-B) is designed as a back-up where assets can be evacuated if the first is compromised. However, as contract ownership for on-going NFT's is not possible to be evacuated in the same way, ownership will be alternated between the timelock contracts governing RV-A and RV-B with each consecutive release. The Emergency Cold Vault (RC-V) is on an entirely cold wallet solely as a last measure evacuation vault in the case both Vault A and B are compromised.

This new vault architecture expands on a thoroughly battle-tested model based on one used in production by Super Studios to secure over $100M in assets, which in turn is based on a model (at least formerly) used by the Aragon and Sushi DAOs to secure billions of dollars in assets and critical governance tokens.

New Architecture: Technical Specifications

Full Diagram

The critical points of this new on-chain asset management architecture are as follows:

there are three distinct human beings acting as multisignature signers.

each signer uses only hardware wallets.

each signer has two signing addresses with exclusively offline backups.

control of assets is split across two different two-of-three multisignature contracts.

all treasury operations must pass through a three day timelock; all operations on non-treasury Remilia smart contracts must also pass through the same timelock.

assets are divided across two vault contracts with special panic features which allow for greater flexibility in event of an attack and evacuation to the emergency wallet—more on this later!

dead signers (as determined by a dead man's switch) must be replaced or else assets are evacuated to the emergency evacuation wallet.

In short, this new architecture is designed to be as robust as possible and to address every specific deficiency which allowed the attack on the previous on-chain assets to happen. What follows is a more detailed look at three distinct flows of transaction data through the new on-chain asset management system.

The Happy Path

In normal operation, when nothing is going wrong, the new security architecture operates quite simply. Every transfer of assets out of one of the multisignature treasuries requires the approval of two out of the three signers. Then, the asset transfer is delayed by a three day timelock. Only after clearing the timelock do assets finally leave one of the vaults.

Happy Path

This addresses several problems present in the previous system. This time, the signers are three distinct people using their own computers and Trezor hardware wallets with strictly-offline backups; the likelihood of compromising every signer simultaneously is much lower. Furthermore, the mandatory timelock provides ample time to review any pending asset transfer. This delay dramatically increases the time for intervention in the event of an attack on the treasury.

This timelock system is also used to manage every other non-treasury smart contract that Remilia might deploy in the future, to further reassure the community that they can be surprised by no dramatic action.

A Dead Signer

In the attack experienced against the prior treasury, Remilia was left with a dead signer. The hardware wallet which survived being compromised by the attacker was rendered inoperable by the inability to retrieve its passphrase from the hijacked Bitwarden vault. Given that Remilia has experienced the problem of a dead signer already, it is worth including in the new architecture an explicit mechanism to handle this eventuality.

Dead Signer

The solution is to include a dead man's switch directly into each of the multisignature contracts. If a particular signer neither signs for a transaction nor confirms it is alive with a health ping, the signer is considered dead. The remaining two signers then have one week to elect a new address as the third signer. The default frequency of the health ping is 60 days, although signers may explicitly indicate longer periods of absence if necessary.

If the remaining signers fail to elect a replacement signer, the contents of the vaults are immediately evacuated to the emergency evacuation wallet. In this way the new architecture enforces active management to confirm the availability of its signing keys.

The Panic Mechanic

One of the more unique aspects of the new architecture is its dual-treasury model which lends resilience to partial attacks and an escape hatch for worst-case scenarios.

Panic Mechanic

In typical operation, the signers of vault one are delayed for three days by timelock one. Similarly, the signers of vault two are delayed by timelock two. However, we permit one specific operation to use opposing signers and skip the timelock: draining all assets of vault one into vault two or vice-versa.

This is designed to protect against one specific flavor of partial attack. Consider the following: an attacker has compromised two of the three keys needed to transfer assets from vault one but has not gained any access to vault two. In this situation, the attacker would be able to instantly drain all assets from vault two into vault one. Now vault one contains all of Remilia's assets. However, the attacker's transaction to transfer these assets out of vault one must clear a three day timelock. Remilia's monitoring would notify staff and they would be able to counter-drain all assets from vault one back into vault two, where the attacker ultimately would not be able to access them.

What of total vault death? What if the worst happens again and an attacker is able to compromise every signer? In this case, the attacker would be able to move all of Remilia's assets back and forth between the two vaults freely. Any transaction they queued through the timelock would therefore be likely to succeed because they could ensure the assets remain present in whichever vault they are targeting. In this case, we are saved by the panic counter.

Each vault keeps track of how many times it has panicked. If the vaults panic three times, they automatically drain their entire contents to the emergency evacuation wallet. Therefore, in the event of total compromise, Remilia staff has three days to panic each vault in a circle three times to prevent any assets from arriving at the attacker's intended destination.

Regarding the Emergency Evacuation Wallet

All this talk of an emergency evacuation wallet may alarm you. What if an attacker were to gain access to that wallet, isn't that a potential point of failure? This is true and acknowledged. However, assets are only transferred to this wallet as an act of last resort when the new architecture is either already totally compromised by an attacker or left unmaintained. In these extraordinary circumstances, falling back to what will ultimately be managed as another entirely-separate, safe, and utterly-unused ultra-cold wallet is the best we can do.

Conclusion

The unintended treasury decentralization day of March 16th, 2024 was the result of a failure to follow best practices. The new architecture outlined here solves each of the previously-encountered failings while being hardened and future-proofed to protect the Remilia treasury from all attackers for a millennia, going live effective immediately.

            

        

        

        

            Tags: 
NFT

        

        

            Permalink: 
https://blog.remilia.org/remilia-vault/
