import {
  CandyGuard,
  CandyMachine,
  findAllocationTrackerPda,
  findCandyMachineAuthorityPda,
  getMplCandyMachineCoreProgramId,
  safeFetchCandyGuard,
  safeFetchMintCounterFromSeeds,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  MetadataDelegateRole,
  findCollectionAuthorityRecordPda,
  findMasterEditionPda,
  findMetadataDelegateRecordPda,
  findMetadataPda,
  getMplTokenMetadataProgramId,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createLut,
  getSplAssociatedTokenProgramId,
  getSplTokenProgramId,
  getSysvar,
} from "@metaplex-foundation/mpl-toolbox";
import {
  AddressLookupTableInput,
  PublicKey,
  Signer,
  TransactionBuilder,
  Umi,
  publicKey,
  uniquePublicKeys,
} from "@metaplex-foundation/umi";

export const createLutForCandyMachineAndGuard = async (
  umi: Umi,
  recentSlot: number,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  lutAuthority?: Signer
): Promise<[TransactionBuilder, AddressLookupTableInput]> => {
  const addresses = await getLutAddressesForCandyMachineAndGuard(
    umi,
    candyMachine,
    candyGuard
  );

  return createLut(umi, {
    recentSlot,
    addresses,
    authority: lutAuthority,
  });
};

export const getLutAddressesForCandyMachineAndGuard = async (
  umi: Umi,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  collectionUpdateAuthority?: PublicKey
): Promise<PublicKey[]> => {
  if (!umi.identity.publicKey) {
    return [];
  }
  const { mintAuthority, collectionMint } = candyMachine;
  collectionUpdateAuthority = umi.identity.publicKey;
  if (!collectionUpdateAuthority) {
    return [];
  }
  const collectionAuthorityPda = candyMachine.authority;
  safeFetchCandyGuard(umi, candyMachine.mintAuthority);
  const [delegateRecordV2] = findMetadataDelegateRecordPda(umi, {
    mint: collectionMint,
    delegateRole: MetadataDelegateRole.Collection,
    updateAuthority: collectionUpdateAuthority,
    delegate: collectionAuthorityPda,
  });
  const guardKeys: PublicKey[] = [];
  // async iterate through all candyGuard groups and add all guards to guardKeys

  candyGuard.groups.forEach(async (group) => {
    if (group.guards.addressGate.__option === "Some") {
      guardKeys.push(group.guards.addressGate.value.address);
    }
    if (group.guards.allocation.__option === "Some") {
      guardKeys.push(
        publicKey(
          findAllocationTrackerPda(umi, {
            candyGuard: candyGuard.publicKey,
            candyMachine: candyMachine.publicKey,
            id: group.guards.allocation.value.id,
          })
        )
      );
    }
    if (group.guards.freezeSolPayment.__option === "Some") {
      guardKeys.push(group.guards.freezeSolPayment.value.destination);
    }
    if (group.guards.freezeTokenPayment.__option === "Some") {
      guardKeys.push(group.guards.freezeTokenPayment.value.destinationAta);
      guardKeys.push(group.guards.freezeTokenPayment.value.mint);
    }
    if (group.guards.mintLimit.__option === "Some") {
      const mintLimitCounter = await safeFetchMintCounterFromSeeds(umi, {
        id: group.guards.mintLimit.value.id,
        user: umi.identity.publicKey,
        candyMachine: candyMachine.publicKey,
        candyGuard: candyGuard.publicKey,
      });
      if (mintLimitCounter?.publicKey) {
        guardKeys.push(mintLimitCounter.publicKey);
      }
    }
    if (group.guards.nftBurn.__option === "Some") {
      guardKeys.push(group.guards.nftBurn.value.requiredCollection);
    }
    if (group.guards.nftGate.__option === "Some") {
      guardKeys.push(group.guards.nftGate.value.requiredCollection);
    }
    if (group.guards.nftPayment.__option === "Some") {
      guardKeys.push(group.guards.nftPayment.value.requiredCollection);
    }
    if (group.guards.programGate.__option === "Some") {
      //push the array content from group.guards.programGate.value.additional into guardKeys
      group.guards.programGate.value.additional.forEach((programGate) => {
        guardKeys.push(programGate);
      });
    }
    if (group.guards.solPayment.__option === "Some") {
      guardKeys.push(group.guards.solPayment.value.destination);
    }
    if (group.guards.token2022Payment.__option === "Some") {
      guardKeys.push(group.guards.token2022Payment.value.destinationAta);
      guardKeys.push(group.guards.token2022Payment.value.mint);
    }
    if (group.guards.tokenBurn.__option === "Some") {
      guardKeys.push(group.guards.tokenBurn.value.mint);
    }
    if (group.guards.tokenGate.__option === "Some") {
      guardKeys.push(group.guards.tokenGate.value.mint);
    }
    if (group.guards.tokenPayment.__option === "Some") {
      guardKeys.push(group.guards.tokenPayment.value.mint);
      guardKeys.push(group.guards.tokenPayment.value.destinationAta);
    }
  });

  // Add collection Authority PDA
  guardKeys.push(
    publicKey(
      findCollectionAuthorityRecordPda(umi, {
        mint: collectionMint,
        collectionAuthority: umi.identity.publicKey,
      })
    )
  );
  const [collectionAuthorityRecord] = findCollectionAuthorityRecordPda(umi, {
    mint: collectionMint,
    collectionAuthority: umi.identity.publicKey,
  });

  return uniquePublicKeys([
    candyMachine.publicKey,
    mintAuthority,
    collectionMint,
    findMetadataPda(umi, { mint: collectionMint })[0],
    findMasterEditionPda(umi, { mint: collectionMint })[0],
    collectionUpdateAuthority,
    findCandyMachineAuthorityPda(umi, {
      candyMachine: candyMachine.publicKey,
    })[0],
    delegateRecordV2,
    getSysvar("instructions"),
    getSysvar("slotHashes"),
    getMplCandyMachineCoreProgramId(umi),
    getMplTokenMetadataProgramId(umi),
    getSplTokenProgramId(umi),
    getSplAssociatedTokenProgramId(umi),
    ...guardKeys,
    publicKey("BeeryDvghgcKPTUw3N3bdFDFFWhTWdWHnsLuVebgsGSD"),
    collectionAuthorityRecord,
  ]);
};
