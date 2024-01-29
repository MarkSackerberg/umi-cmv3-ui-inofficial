import {
  Allocation,
  CandyMachine,
  GuardSet,
  MintLimit,
  safeFetchAllocationTrackerFromSeeds,
  safeFetchMintCounterFromSeeds,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  fetchToken,
  findAssociatedTokenPda,
} from "@metaplex-foundation/mpl-toolbox";
import {
  PublicKey,
  SolAmount,
  Some,
  Umi,
  publicKey,
} from "@metaplex-foundation/umi";
import { DigitalAssetWithToken } from "@metaplex-foundation/mpl-token-metadata";
import { createStandaloneToast } from "@chakra-ui/react";

export interface GuardReturn {
  label: string;
  allowed: boolean;
  minting?: boolean;
  loadingText?: string;
  reason?: string;
  maxAmount: number;
  mintAmount?: number;
}

export const addressGateChecker = (wallet: PublicKey, address: PublicKey) => {
  if (wallet != address) {
    return false;
  }
  return true;
};

export const allocationChecker = async (
  umi: Umi,
  candyMachine: CandyMachine,
  guard: {
    label: string;
    guards: GuardSet;
}
) => {
  const allocation = guard.guards.allocation as Some<Allocation>;

  try {
    const mintCounter = await safeFetchAllocationTrackerFromSeeds(umi, {
      id: allocation.value.id,
      candyMachine: candyMachine.publicKey,
      candyGuard: candyMachine.mintAuthority,
    });

    if (mintCounter) {
      return allocation.value.limit - mintCounter.count;
    } else {
      // no allocation mint Counter found - not created yet
      createStandaloneToast().toast({
        title: "Allocation Guard not Initialized!",
        description: "Minting will fail!",
        status: "error",
        duration: 900,
        isClosable: true,
      });
      return allocation.value.limit;
    }

  } catch (error) {
    console.error(`AllocationChecker: ${error}`);
    return 0;
  }
};

export const solBalanceChecker = (
  solBalance: SolAmount,
  solAmount: SolAmount
) => {
  if (solAmount > solBalance) {
    return false;
  }
  return true;
};

export const tokenBalanceChecker = async (
  umi: Umi,
  tokenAmount: bigint,
  tokenMint: PublicKey
) => {
  const ata = findAssociatedTokenPda(umi, {
    mint: tokenMint,
    owner: umi.identity.publicKey,
  });

  const balance = await fetchToken(umi, umi.identity.publicKey);

  if (Number(balance.amount) < Number(tokenAmount)) {
    return false;
  }
  return true;
};

export const mintLimitChecker = async (
  umi: Umi,
  candyMachine: CandyMachine,
  guard: {
    label: string;
    guards: GuardSet;
}
) => {
  const mintLimit = guard.guards.mintLimit as Some<MintLimit>;

  //not minted yet
  try {
    const mintCounter = await safeFetchMintCounterFromSeeds(umi, {
      id: mintLimit.value.id,
      user: umi.identity.publicKey,
      candyMachine: candyMachine.publicKey,
      candyGuard: candyMachine.mintAuthority,
    });

    if (mintCounter) {
      return mintLimit.value.limit - mintCounter.count;
    } else {
      // no mintlimit counter found. Possibly the first mint
      return mintLimit.value.limit;
    }
  } catch (error) {
    console.error(`mintLimitChecker: ${error}`);
    return 0;
  }
};

export const ownedNftChecker = async (
  ownedNfts: DigitalAssetWithToken[],
  requiredCollection: PublicKey
) => {
  const count = ownedNfts.filter(
    (el) =>
      el.metadata.collection.__option === "Some" &&
      el.metadata.collection.value.key === requiredCollection
  ).length;
  return count;
};

export const allowlistChecker = (
  allowLists: Map<string, string[]>,
  umi: Umi,
  guardlabel: string
) => {
  if (!allowLists.has(guardlabel)) {
    console.error(`Guard ${guardlabel}; allowlist missing from allowlist.tsx`);
    return false;
  }
  if (
    !allowLists
      .get(guardlabel)
      ?.includes(publicKey(umi.identity.publicKey))
  ) {
    return false;
  }
  return true;
};

export const getSolanaTime = async (umi: Umi) => {
  const slot = await umi.rpc.getSlot();

  let solanaTime = await umi.rpc.getBlockTime(slot);

  if (!solanaTime) solanaTime = BigInt(0);
  return solanaTime;
};

export const checkDateRequired = (
  guards: { label: string; guards: GuardSet }[]
) => {
  for (const guard of guards) {
    if (guard.guards.startDate || guard.guards.endDate) {
      return true;
    }
  }

  return false;
};

export const checkSolBalanceRequired = (
  guards: { label: string; guards: GuardSet }[]
) => {
  let solBalanceRequired: boolean = false;
  guards.forEach((guard) => {
    if (guard.guards.freezeSolPayment || guard.guards.solPayment) {
      solBalanceRequired = true;
    }
  });

  return solBalanceRequired;
};

export const checkTokensRequired = (
  guards: { label: string; guards: GuardSet }[]
) => {
  let nftBalanceRequired: boolean = false;
  guards.forEach((guard) => {
    if (
      guard.guards.nftBurn ||
      guard.guards.nftGate ||
      guard.guards.nftPayment
    ) {
      nftBalanceRequired = true;
    }
  });

  return nftBalanceRequired;
};

export const calculateMintable = (
  mintableAmount: number,
  newAmount: number
) => {
  if (mintableAmount > newAmount){
    mintableAmount = newAmount;
  }

  if (!process.env.NEXT_PUBLIC_MAXMINTAMOUNT) return mintableAmount;
  let maxmintamount = 0;
  try {
    maxmintamount = Number(process.env.NEXT_PUBLIC_MAXMINTAMOUNT)
  } catch (e){
    console.error('process.env.NEXT_PUBLIC_MAXMINTAMOUNT is not a number!', e)
    return mintableAmount;
  }
  if (mintableAmount > maxmintamount){
    mintableAmount = maxmintamount;
  }

  return mintableAmount;
};