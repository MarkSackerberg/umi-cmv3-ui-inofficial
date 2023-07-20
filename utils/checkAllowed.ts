import {
  AddressGate,
  CandyGuard,
  CandyMachine,
  EndDate,
  FreezeSolPayment,
  FreezeTokenPayment,
  GuardSet,
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
  checkTokensRequired,
  checkSolBalanceRequired,
  mintLimitChecker,
  ownedNftChecker,
  GuardReturn,
} from "./checkerHelper";
import { allowLists } from "./../allowlist";
import {
  DigitalAssetWithToken,
  fetchAllDigitalAssetWithTokenByOwner,
} from "@metaplex-foundation/mpl-token-metadata";

export const guardChecker = async (
  umi: Umi,
  candyGuard: CandyGuard,
  candyMachine: CandyMachine,
  solanaTime: bigint
) => {
  let guardReturn: GuardReturn[] = [];
  let ownedTokens: DigitalAssetWithToken[] = [];
  if (!candyGuard) {
    if (guardReturn.length === 0) {
      //guardReturn.push({ label: "default", allowed: false });
    }
    return { guardReturn, ownedNfts: ownedTokens };
  }

  let guardsToCheck: { label: string; guards: GuardSet }[] = candyGuard.groups;
  guardsToCheck.push({ label: "default", guards: candyGuard.guards });

  //no wallet connected. return dummies
  const dummyPublicKey = publicKey("11111111111111111111111111111111");
  if (
    umi.identity.publicKey === dummyPublicKey ||
    candyMachine.itemsLoaded - Number(candyMachine.itemsRedeemed) === 0
  ) {
    for (const eachGuard of guardsToCheck) {
      guardReturn.push({
        label: eachGuard.label,
        allowed: false,
        reason: "Please connect your wallet to mint",
      });
    }
    return { guardReturn, ownedNfts: ownedTokens };
  }

  let solBalance: SolAmount = sol(0);
  if (checkSolBalanceRequired(guardsToCheck)) {
    try {
      const account = await umi.rpc.getAccount(umi.identity.publicKey);
      assertAccountExists(account);
      solBalance = account.lamports;
    } catch (e) {
      for (const eachGuard of guardsToCheck) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Wallet does not exist. Do you have SOL?",
        });
      }
      return { guardReturn, ownedNfts: ownedTokens };
    }
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
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "AddressGate: Wrong Address",
        });
        continue;
      }
    }

    if (singleGuard.allowList.__option === "Some") {
      if (!allowlistChecker(allowLists, umi, eachGuard.label)) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Wallet not allowlisted",
        });
        console.info(`Guard ${eachGuard.label} wallet not allowlisted!`);
        continue;
      }
    }

    if (singleGuard.endDate.__option === "Some") {
      const addressGate = singleGuard.endDate as Some<EndDate>;
      if (solanaTime > addressGate.value.date) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Mint time is over!",
        });
        console.info(`Guard ${eachGuard.label}; endDate reached!`);
        continue;
      }
    }

    if (singleGuard.freezeSolPayment.__option === "Some") {
      const freezeSolPayment =
        singleGuard.freezeSolPayment as Some<FreezeSolPayment>;
      if (freezeSolPayment.value.lamports.basisPoints > solBalance.basisPoints) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough SOL",
        });
        console.info(
          `Guard ${eachGuard.label}; freezeSolPayment: not enough SOL`
        );
        continue;
      }
    }

    if (singleGuard.mintLimit.__option === "Some") {
      if (!(await mintLimitChecker(umi, candyMachine, eachGuard))) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Mint limit of this wallet reached",
        });
        console.info(`Guard ${eachGuard.label}; mintLimit reached`);
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
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
        });
        console.info(`${eachGuard.label}: Token Balance too low !`);
        continue;
      }
    }

    if (singleGuard.nftBurn.__option === "Some") {
      const nftBurn = singleGuard.nftBurn as Some<NftBurn>;
      if (!ownedNftChecker(ownedTokens, nftBurn.value.requiredCollection)) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No NFT to burn!",
        });
        console.info(`${eachGuard.label}: No Nft to burn!`);
        continue;
      }
    }

    if (singleGuard.nftGate.__option === "Some") {
      const nftGate = singleGuard.nftGate as Some<NftGate>;
      if (!ownedNftChecker(ownedTokens, nftGate.value.requiredCollection)) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No NFT of the requred held!",
        });
        console.info(`${eachGuard.label}: NftGate no NFT held!`);
        continue;
      }
    }

    if (singleGuard.nftPayment.__option === "Some") {
      const nftPayment = singleGuard.nftPayment as Some<NftPayment>;
      if (!ownedNftChecker(ownedTokens, nftPayment.value.requiredCollection)) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No NFT to pay with!",
        });
        console.info(`${eachGuard.label}: nftPayment no NFT to pay with`);
        continue;
      }
    }

    if (singleGuard.redeemedAmount.__option === "Some") {
      const redeemedAmount = singleGuard.redeemedAmount as Some<RedeemedAmount>;
      if (redeemedAmount.value.maximum >= candyMachine.itemsRedeemed) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Too many NFTs redeemed!",
        });
        console.info(
          `${eachGuard.label}: redeemedAmount Too many NFTs redeemed!`
        );
        continue;
      }
    }

    if (singleGuard.solPayment.__option === "Some") {
      const solPayment = singleGuard.solPayment as Some<SolPayment>;
      if (solPayment.value.lamports.basisPoints > solBalance.basisPoints) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough SOL!",
        });
        console.info(`${eachGuard.label} SolPayment not enough SOL!`);
        continue;
      }
    }

    if (singleGuard.startDate.__option === "Some") {
      const startDate = singleGuard.startDate as Some<StartDate>;
      if (solanaTime < startDate.value.date) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "StartDate not reached!",
        });
        console.info(`${eachGuard.label} StartDate not reached!`);

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
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
        });
        console.info(`${eachGuard.label} tokenBurn not enough tokens!`);
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
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
        });
        console.info(`${eachGuard.label} tokenGate not enough tokens!`);
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
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
        });
        console.info(`${eachGuard.label} tokenPayment not enough tokens!`);
        continue;
      }
    }

    if (singleGuard.token2022Payment.__option === "Some") {
      const token2022Payment =
        singleGuard.token2022Payment as Some<TokenPayment>;
      const digitalAssetWithToken = ownedTokens?.find(
        (el) => el.mint.publicKey === token2022Payment.value.mint
      );
      if (
        !digitalAssetWithToken ||
        digitalAssetWithToken.token.amount >= token2022Payment.value.amount
      ) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
        });
        console.info(`${eachGuard.label} token2022Payment not enough tokens!`);
        continue;
      }
    }
    guardReturn.push({ label: eachGuard.label, allowed: true });
  }
  return { guardReturn, ownedTokens };
};
