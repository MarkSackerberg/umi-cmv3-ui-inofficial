import {
  CandyMachine,
  GuardSet,
  MintLimit,
  safeFetchMintCounterFromSeeds,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  fetchToken,
  findAssociatedTokenPda,
} from "@metaplex-foundation/mpl-essentials";
import {
  PublicKey,
  SolAmount,
  Umi,
  base58PublicKey,
} from "@metaplex-foundation/umi";
import { DigitalAssetWithToken } from "@metaplex-foundation/mpl-token-metadata";

export const addressGateChecker = (wallet: PublicKey, address: PublicKey) => {
  if (wallet != address) {
    console.error(`addressGate: You are not allowed to mint`);
    return false;
  }
  return true;
};

export const solBalanceChecker = (
  solBalance: SolAmount,
  solAmount: SolAmount
) => {
  if (solAmount > solBalance) {
    console.error("freezeSolPayment/solPayment: Not enough SOL!");
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
  mintLimit: MintLimit
) => {
  if (!mintLimit) {
    return;
  }
  const mintLimitCounter = await safeFetchMintCounterFromSeeds(umi, {
    id: mintLimit.id,
    user: umi.identity.publicKey,
    candyMachine: candyMachine.publicKey,
    candyGuard: candyMachine.mintAuthority,
  });

  if (!mintLimitCounter || mintLimitCounter.count >= mintLimit.limit) {
    console.error("mintLimit: mintLimit reached!");
    return false;
  }
  return true;
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
    console.error("nftBurn: The user has no NFT to pay with!");
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
    console.error(`Guard ${guardlabel}; allowlist missing in template`);
    return false;
  }
  if (
    !allowLists
      .get(guardlabel)
      ?.includes(base58PublicKey(umi.identity.publicKey))
  ) {
    console.error(`Guard ${guardlabel}; allowlist wallet not allowlisted`);
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
