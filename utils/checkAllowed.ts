import { CandyGuard, CandyMachine, GuardSet } from "@metaplex-foundation/mpl-candy-machine";
import { Token, fetchAllTokenByOwner } from "@metaplex-foundation/mpl-essentials";
import { PublicKey, Umi, amountToNumber, assertAccountExists, publicKey } from "@metaplex-foundation/umi";
import { addressGateChecker, checkDateRequired, checkNftsRequired, checkSolBalanceRequired, getSolanaTime } from "./checkerHelper";

export interface GuardReturn {
  label: string;
  allowed: boolean;
}

export const guardChecker = async (umi: Umi, candyGuard: CandyGuard, candyMachine: CandyMachine) => {
  let guardReturn: GuardReturn[] = [];
  let ownedNfts: Token[] | undefined;
  if (!candyGuard) {
    guardReturn.push({ label: "default", allowed: false });
    return { guardReturn, ownedNfts };
  }

  let guardsToCheck: { label: string; guards: GuardSet }[] =
    candyGuard.groups;

  guardsToCheck.push({
    label: "default",
    guards: candyGuard.guards,
  });

  //no wallet connected. return dummies
  const dummyPublicKey = publicKey("11111111111111111111111111111111");
  if (umi.identity.publicKey === dummyPublicKey) {
    for (const eachGuard of guardsToCheck) {
      guardReturn.push({ label: eachGuard.label, allowed: false });
    }
    console.log("No wallet connected - returning dummy buttons");
    return { guardReturn, ownedNfts };
  }

  // get as much required data upfront as possible
  let solanaTime = BigInt(0);
  if (checkDateRequired(guardsToCheck)) {
    solanaTime = await getSolanaTime(umi);
  }

  let solBalance = 0;
  if (checkSolBalanceRequired(guardsToCheck)) {
    const account = await umi.rpc.getAccount(umi.identity.publicKey);
    assertAccountExists(account);
    console.log(amountToNumber(account.lamports));
  }

  if (checkNftsRequired(guardsToCheck)) {
    ownedNfts = await fetchAllTokenByOwner(umi,umi.identity.publicKey)
  }

  for (const eachGuard of guardsToCheck) {
    const singleGuard = eachGuard.guards;
    if (singleGuard.addressGate != null) {
      if (
        !addressGateChecker(
          umi.identity.publicKey,
          publicKey(singleGuard.addressGate.address)
        )
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    //generate and print merkleRoot in case the guardlabel is present in allowlist.tsx but not assigned
    if (
      umi.identity.publicKey ===
      candyMachine.authorityAddress.toBase58()
    ) {
      const allowlist = allowLists.get(eachGuard.label);
      if (allowlist) {
        //@ts-ignore
        console.log(
          `add this merkleRoot to your candy guard config! ${getMerkleRoot(
            allowlist
          ).toString("hex")}`
        );
      }
    }

    if (singleGuard.allowList) {
      if (!allowlistChecker(allowLists, metaplex, eachGuard.label)) {
        console.error(`wallet not allowlisted!`);
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.endDate) {
      if (solanaTime > Number(singleGuard.endDate.date.toString(10)))
        guardReturn.push({ label: eachGuard.label, allowed: false });
      console.error("Guard ${eachGuard.label}; endDate: reached!");
      continue;
    }

    if (singleGuard.freezeSolPayment) {
      if (!solBalanceChecker(solBalance, singleGuard.freezeSolPayment.amount)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(
          `Guard ${eachGuard.label}; freezeSolPayment: not enough SOL`
        );
        continue;
      }
    }

    if (singleGuard.mintLimit) {
      if (!mintLimitChecker(umi, candyMachine, singleGuard)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.freezeTokenPayment) {
      if (
        !tokenBalanceChecker(
          metaplex,
          singleGuard.freezeTokenPayment.amount,
          singleGuard.freezeTokenPayment.mint
        )
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.nftBurn) {
      //@ts-ignore
      if (!ownedNftChecker(ownedNfts, singleGuard.nftBurn.requiredCollection)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.nftGate) {
      //@ts-ignore
      if (!ownedNftChecker(ownedNfts, singleGuard.nftGate.requiredCollection)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.nftPayment) {
      if (
        //@ts-ignore
        !ownedNftChecker(ownedNfts, singleGuard.nftPayment.requiredCollection)
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.redeemedAmount) {
      if (singleGuard.redeemedAmount.maximum >= candyMachine.itemsMinted) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.solPayment) {
      if (!solBalanceChecker(solBalance, singleGuard.solPayment.amount)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.startDate) {
      if (solanaTime < Number(singleGuard.startDate.date.toString(10))) {
        console.error(`${eachGuard.label} guard not live!`);
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.tokenBurn) {
      if (
        !tokenBalanceChecker(
          metaplex,
          singleGuard.tokenBurn.amount,
          singleGuard.tokenBurn.mint
        )
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.tokenGate) {
      if (
        !tokenBalanceChecker(
          metaplex,
          singleGuard.tokenGate.amount,
          singleGuard.tokenGate.mint
        )
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.tokenPayment) {
      if (
        !tokenBalanceChecker(
          metaplex,
          singleGuard.tokenPayment.amount,
          singleGuard.tokenPayment.mint
        )
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    guardReturn.push({ label: eachGuard.label, allowed: true });
  }
  return { guardReturn, ownedNfts };
};
