import {
  AddressGate,
  CandyGuard,
  CandyMachine,
  EndDate,
  FreezeSolPayment,
  FreezeTokenPayment,
  GuardSet,
  MintLimit,
  NftBurn,
  NftGate,
  NftPayment,
  RedeemedAmount,
  SolPayment,
  StartDate,
  TokenBurn,
  TokenGate,
  TokenPayment,
  getMerkleRoot,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  SolAmount,
  Some,
  Umi,
  assertAccountExists,
  publicKey,
  sol,
} from "@metaplex-foundation/umi";
import {
  addressGateChecker,
  allowlistChecker,
  checkDateRequired,
  checkTokensRequired,
  checkSolBalanceRequired,
  getSolanaTime,
  mintLimitChecker,
  ownedNftChecker,
  solBalanceChecker,
  tokenBalanceChecker,
} from "./checkerHelper";
import { allowLists } from "./../allowlist";
import {
  DigitalAssetWithToken,
  fetchAllDigitalAssetWithTokenByOwner,
} from "@metaplex-foundation/mpl-token-metadata";

export interface GuardReturn {
  label: string;
  allowed: boolean;
}

export const guardChecker = async (
  umi: Umi,
  candyGuard: CandyGuard,
  candyMachine: CandyMachine
) => {
  let guardReturn: GuardReturn[] = [];
  let ownedTokens: DigitalAssetWithToken[] = [];
  if (!candyGuard) {
    guardReturn.push({ label: "default", allowed: false });
    return { guardReturn, ownedNfts: ownedTokens };
  }

  let guardsToCheck: { label: string; guards: GuardSet }[] = candyGuard.groups;

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
    return { guardReturn, ownedNfts: ownedTokens };
  }

  // get as much required data upfront as possible
  let solanaTime = BigInt(0);
  if (checkDateRequired(guardsToCheck)) {
    solanaTime = await getSolanaTime(umi);
  }

  let solBalance: SolAmount = sol(0);
  if (checkSolBalanceRequired(guardsToCheck)) {
    const account = await umi.rpc.getAccount(umi.identity.publicKey);
    assertAccountExists(account);
    solBalance = account.lamports;
    console.log(`Wallet balance ${solBalance}`);
  }

  if (checkTokensRequired(guardsToCheck)) {
    ownedTokens = await fetchAllDigitalAssetWithTokenByOwner(
      umi,
      umi.identity.publicKey
    );
  }

  for (const eachGuard of guardsToCheck) {
    const singleGuard = eachGuard.guards;
    if (singleGuard.addressGate.__option === "Some") {
      const addressGate = singleGuard.addressGate as Some<AddressGate>;
      if (
        !addressGateChecker(
          umi.identity.publicKey,
          publicKey(addressGate.value.address)
        )
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    //generate and print merkleRoot in case the guardlabel is present in allowlist.tsx but not assigned
    if (umi.identity.publicKey === candyMachine.authority) {
      const allowlist = allowLists.get(eachGuard.label);
      if (allowlist) {
        console.log(
          `add this merkleRoot to your candy guard config! ${getMerkleRoot(
            allowlist
            //@ts-ignore
          ).toString("hex")}`
        );
      }
    }

    if (singleGuard.allowList.__option === "Some") {
      if (!allowlistChecker(allowLists, umi, eachGuard.label)) {
        console.error(`Guard ${eachGuard.label} wallet not allowlisted!`);
        guardReturn.push({ label: eachGuard.label, allowed: false });
        continue;
      }
    }

    if (singleGuard.endDate.__option === "Some") {
      const addressGate = singleGuard.endDate as Some<EndDate>;
      if (solanaTime > addressGate.value.date)
        guardReturn.push({ label: eachGuard.label, allowed: false });
      console.error(`Guard ${eachGuard.label}; endDate reached!`);
      continue;
    }

    if (singleGuard.freezeSolPayment.__option === "Some") {
      const freezeSolPayment =
        singleGuard.freezeSolPayment as Some<FreezeSolPayment>;
      if (freezeSolPayment.value.lamports > solBalance) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(
          `Guard ${eachGuard.label}; freezeSolPayment: not enough SOL`
        );
        continue;
      }
    }

    if (singleGuard.mintLimit.__option === "Some") {
      const mintLimit = singleGuard.mintLimit as Some<MintLimit>;
      if (!mintLimitChecker(umi, candyMachine, mintLimit.value)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`Guard ${eachGuard.label}; mintLimit: not enough SOL`);
        continue;
      }
    }

    if (singleGuard.freezeTokenPayment.__option === "Some") {
      const freezeTokenPayment =
        singleGuard.freezeTokenPayment as Some<FreezeTokenPayment>;
      const digitalAssetWithToken = ownedTokens?.find(
        (el) => el.mint.publicKey === freezeTokenPayment.value.mint
      );
      if (
        !digitalAssetWithToken ||
        digitalAssetWithToken.token.amount >= freezeTokenPayment.value.amount
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label}: Token Balance too low !`);
        continue;
      }
    }

    if (singleGuard.nftBurn.__option === "Some") {
      const nftBurn = singleGuard.nftBurn as Some<NftBurn>;
      if (!ownedNftChecker(ownedTokens, nftBurn.value.requiredCollection)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label}: No Nft to burn!`);
        continue;
      }
    }

    if (singleGuard.nftGate.__option === "Some") {
      const nftGate = singleGuard.nftGate as Some<NftGate>;
      if (!ownedNftChecker(ownedTokens, nftGate.value.requiredCollection)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label}: NftGate no NFT held!`);
        continue;
      }
    }

    if (singleGuard.nftPayment.__option === "Some") {
      const nftPayment = singleGuard.nftPayment as Some<NftPayment>;
      if (!ownedNftChecker(ownedTokens, nftPayment.value.requiredCollection)) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label}: nftPayment no NFT to pay with`);
        continue;
      }
    }

    if (singleGuard.redeemedAmount.__option === "Some") {
      const redeemedAmount = singleGuard.redeemedAmount as Some<RedeemedAmount>;
      if (redeemedAmount.value.maximum >= candyMachine.itemsRedeemed) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(
          `${eachGuard.label}: redeemedAmount Too many NFTs redeemed!`
        );
        continue;
      }
    }

    if (singleGuard.solPayment.__option === "Some") {
      const solPayment = singleGuard.solPayment as Some<SolPayment>;
      if (solPayment.value.lamports > solBalance) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label} SolPayment not enough SOL!`);
        continue;
      }
    }

    if (singleGuard.startDate.__option === "Some") {
      const startDate = singleGuard.solPayment as Some<StartDate>;
      if (solanaTime < startDate.value.date) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label} StartDate not reached!`);

        continue;
      }
    }

    if (singleGuard.tokenBurn.__option === "Some") {
      const tokenBurn = singleGuard.tokenBurn as Some<TokenBurn>;
      const digitalAssetWithToken = ownedTokens?.find(
        (el) => el.mint.publicKey === tokenBurn.value.mint
      );
      if (
        !digitalAssetWithToken ||
        digitalAssetWithToken.token.amount >= tokenBurn.value.amount
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label} tokenBurn not enough tokens!`);
        continue;
      }
    }

    if (singleGuard.tokenGate.__option === "Some") {
      const tokenGate = singleGuard.tokenGate as Some<TokenGate>;
      const digitalAssetWithToken = ownedTokens?.find(
        (el) => el.mint.publicKey === tokenGate.value.mint
      );
      if (
        !digitalAssetWithToken ||
        digitalAssetWithToken.token.amount >= tokenGate.value.amount
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label} tokenGate not enough tokens!`);
        continue;
      }
    }

    if (singleGuard.tokenPayment.__option === "Some") {
      const tokenPayment = singleGuard.tokenPayment as Some<TokenPayment>;
      const digitalAssetWithToken = ownedTokens?.find(
        (el) => el.mint.publicKey === tokenPayment.value.mint
      );
      if (
        !digitalAssetWithToken ||
        digitalAssetWithToken.token.amount >= tokenPayment.value.amount
      ) {
        guardReturn.push({ label: eachGuard.label, allowed: false });
        console.error(`${eachGuard.label} tokenPayment not enough tokens!`);
        continue;
      }
    }

    guardReturn.push({ label: eachGuard.label, allowed: true });
  }
  return { guardReturn, ownedNfts: ownedTokens };
};
