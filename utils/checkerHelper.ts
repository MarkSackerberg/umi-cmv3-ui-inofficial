import {
  CandyMachine,
  GuardSet,
  MintLimit,
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

export interface GuardReturn {
  label: string;
  allowed: boolean;
  minting?: boolean;
  loadingText?: string;
  reason?: string;
}

export const addressGateChecker = (wallet: PublicKey, address: PublicKey) => {
  if (wallet != address) {
    return false;
  }
  return true;
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

    if (mintCounter && mintCounter.count >= mintLimit.value.limit) {
      return false;
    }

    return true;
  } catch (error) {
    console.error(`mintLimitChecker: ${error}`);
    return false;
  }
};

export const ownedNftChecker = async (
  ownedNfts: DigitalAssetWithToken[],
  requiredCollection: PublicKey
) => {
  const digitalAssetWithToken = ownedNfts.find(
    (el) =>
      el.metadata.collection.__option === "Some" &&
      el.metadata.collection.value.key === requiredCollection
  );
  if (!digitalAssetWithToken) {
    return false;
  } else {
    return true;
  }
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
