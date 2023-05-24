import { UmiContext } from "@/pages/useUmi";
import {
  fetchAllMintCounter,
  findMintCounterPda,
  getAccountVersionSerializer,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  fetchAllToken,
  fetchToken,
  findAssociatedTokenPda,
} from "@metaplex-foundation/mpl-essentials";
import { PublicKey, SolAmount, Umi, publicKey } from "@metaplex-foundation/umi";

export const addressGateChecker = (wallet: PublicKey, address: PublicKey) => {
  if (wallet != address) {
    console.error(`addressGate: You are not allowed to mint`);
    return false;
  }
  return true;
};

export const solBalanceChecker = (solBalance: number, solAmount: SolAmount) => {
  const costInLamports = Number(solAmount.basisPoints.toString(10));
  if (costInLamports > solBalance) {
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
  singleGuard: DefaultCandyGuardSettings
) => {
  if (!singleGuard.mintLimit || !candyMachine.candyGuard) {
    return;
  }

  const mintLimitCounter = findMintCounterPda(umi, {
    id: singleGuard.mintLimit.id,
    user: umi.identity.publicKey,
    candyMachine: candyMachine.address,
    candyGuard: candyMachine.candyGuard.address,
  });

  const mintedAmountBuffer = await metaplex.connection.getAccountInfo(
    mintLimitCounter,
    "processed"
  );

  let mintedAmount: Number = 0;
  if (mintedAmountBuffer != null) {
    mintedAmount = mintedAmountBuffer.data.readUintLE(0, 1);
  }

  if (mintedAmount >= singleGuard.mintLimit.limit) {
    console.error("mintLimit: mintLimit reached!");
    return false;
  }
  return true;
};

export const ownedNftChecker = async (
  ownedNfts: FindNftsByOwnerOutput,
  requiredCollection: PublicKey
) => {
  const nftsInCollection = ownedNfts.filter((obj) => {
    return (
      obj.collection?.address.toBase58() === requiredCollection.toBase58() &&
      obj.collection?.verified === true
    );
  });
  if (nftsInCollection.length < 1) {
    console.error("nftBurn: The user has no NFT to pay with!");
    return false;
  } else {
    return true;
  }
};

export const allowlistChecker = (
  allowLists: Map<string, string[]>,
  metaplex: Metaplex,
  guardlabel: string
) => {
  if (!allowLists.has(guardlabel)) {
    console.error(`Guard ${guardlabel}; allowlist missing in template`);
    return false;
  }
  if (
    !allowLists
      .get(guardlabel)
      ?.includes(metaplex.identity().publicKey.toBase58())
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
  guards: { label: string; guards: DefaultCandyGuardSettings }[]
) => {
  for (const guard of guards) {
    if (guard.guards.startDate || guard.guards.endDate) {
      return true;
    }
  }

  return false;
};

export const checkSolBalanceRequired = (
  guards: { label: string; guards: DefaultCandyGuardSettings }[]
) => {
  let solBalanceRequired: boolean = false;
  guards.forEach((guard) => {
    if (guard.guards.freezeSolPayment || guard.guards.solPayment) {
      solBalanceRequired = true;
    }
  });

  return solBalanceRequired;
};

export const checkNftsRequired = (
  guards: { label: string; guards: DefaultCandyGuardSettings }[]
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
