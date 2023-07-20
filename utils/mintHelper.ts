import { allowLists } from "@/allowlist";
import {
  CandyGuard,
  CandyMachine,
  GuardGroup,
  DefaultGuardSet,
  DefaultGuardSetMintArgs,
  getMerkleRoot,
  route,
  getMerkleProof,
  safeFetchAllowListProofFromSeeds,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  DigitalAssetWithToken,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  some,
  Umi,
  transactionBuilder,
  publicKey,
  TransactionBuilder,
  none,
  AddressLookupTableInput,
  sol,
} from "@metaplex-foundation/umi";
import { GuardReturn } from "./checkerHelper";
import {
  fetchAddressLookupTable,
  transferSol,
} from "@metaplex-foundation/mpl-toolbox";
import { UseToastOptions } from "@chakra-ui/react";

export interface GuardButtonList extends GuardReturn {
  header: string;
  mintText: string;
  buttonLabel: string;
  startTime: bigint;
  endTime: bigint;
  tooltip?: string;
}

export const chooseGuardToUse = (
  guard: GuardReturn,
  candyGuard: CandyGuard
) => {
  let guardGroup = candyGuard?.groups.find(
    (item) => item.label === guard.label
  );
  if (guardGroup) {
    return guardGroup;
  }

  if (candyGuard != null) {
    return {
      label: "default",
      guards: candyGuard.guards,
    };
  }

  console.error("No guards defined! No minting possible.");
  return {
    label: "default",
    guards: undefined,
  };
};

export const mintArgsBuilder = (
  candyMachine: CandyMachine,
  guardToUse: GuardGroup<DefaultGuardSet>,
  ownedTokens: DigitalAssetWithToken[]
) => {
  const guards = guardToUse.guards;
  let ruleset = undefined;
  if (candyMachine.ruleSet.__option === "Some") {
    ruleset = candyMachine.ruleSet.value;
  }

  let mintArgs: Partial<DefaultGuardSetMintArgs> = {};
  if (guards.allocation.__option === "Some") {
    mintArgs.allocation = some({ id: guards.allocation.value.id });
  }

  if (guards.allowList.__option === "Some") {
    const allowlist = allowLists.get(guardToUse.label);
    if (!allowlist) {
      console.error(`allowlist for guard ${guardToUse.label} not found!`);
    } else {
      mintArgs.allowList = some({ merkleRoot: getMerkleRoot(allowlist) });
    }
  }

  if (guards.freezeSolPayment.__option === "Some") {
    mintArgs.freezeSolPayment = some({
      destination: guards.freezeSolPayment.value.destination,
    });
  }

  if (guards.freezeTokenPayment.__option === "Some") {
    mintArgs.freezeTokenPayment = some({
      destinationAta: guards.freezeTokenPayment.value.destinationAta,
      mint: guards.freezeTokenPayment.value.mint,
      nftRuleSet: ruleset,
    });
  }

  if (guards.gatekeeper.__option === "Some") {
    mintArgs.gatekeeper = some({
      expireOnUse: guards.gatekeeper.value.expireOnUse,
      gatekeeperNetwork: guards.gatekeeper.value.gatekeeperNetwork,
    });
  }

  if (guards.mintLimit.__option === "Some") {
    mintArgs.mintLimit = some({ id: guards.mintLimit.value.id });
  }

  if (guards.nftBurn.__option === "Some") {
    const requiredCollection = guards.nftBurn.value.requiredCollection;
    //TODO: have the use choose the NFT
    const nft = ownedTokens.find(
      (el) =>
        el.metadata.collection.__option === "Some" &&
        el.metadata.collection.value.key === requiredCollection
    );
    if (!nft) {
      console.error("no nft to burn found!");
    } else {
      let tokenStandard = TokenStandard.NonFungible;
      if (nft.metadata.tokenStandard.__option === "Some") {
        if (
          nft.metadata.tokenStandard.value ===
          TokenStandard.ProgrammableNonFungible
        ) {
          tokenStandard = TokenStandard.ProgrammableNonFungible;
        }
      }
      mintArgs.nftBurn = some({
        mint: nft.publicKey,
        requiredCollection,
        tokenStandard,
      });
    }
  }

  if (guards.nftGate.__option === "Some") {
    const requiredCollection = guards.nftGate.value.requiredCollection;
    const nft = ownedTokens.find(
      (el) =>
        el.metadata.collection.__option === "Some" &&
        el.metadata.collection.value.key === requiredCollection
    );
    if (!nft) {
      console.error("no nft for tokenGate found!");
    } else {
      let tokenStandard = TokenStandard.NonFungible;
      if (nft.metadata.tokenStandard.__option === "Some") {
        if (
          nft.metadata.tokenStandard.value ===
          TokenStandard.ProgrammableNonFungible
        ) {
          tokenStandard = TokenStandard.ProgrammableNonFungible;
        }
      }
      mintArgs.nftGate = some({
        mint: nft.publicKey,
        requiredCollection,
        tokenStandard,
      });
    }
  }

  if (guards.nftPayment.__option === "Some") {
    const requiredCollection = guards.nftPayment.value.requiredCollection;
    const nft = ownedTokens.find(
      (el) =>
        el.metadata.collection.__option === "Some" &&
        el.metadata.collection.value.key === requiredCollection
    );
    if (!nft) {
      console.error("no nft for tokenGate found!");
    } else {
      let tokenStandard = TokenStandard.NonFungible;
      if (nft.metadata.tokenStandard.__option === "Some") {
        if (
          nft.metadata.tokenStandard.value ===
          TokenStandard.ProgrammableNonFungible
        ) {
          tokenStandard = TokenStandard.ProgrammableNonFungible;
        }
      }
      mintArgs.nftPayment = some({
        destination: guards.nftPayment.value.destination,
        mint: nft.publicKey,
        requiredCollection,
        tokenStandard,
      });
    }
  }

  if (guards.solPayment.__option === "Some") {
    mintArgs.solPayment = some({
      destination: guards.solPayment.value.destination,
    });
  }

  if (guards.thirdPartySigner.__option === "Some") {
    console.error("not supported. you need a backend");
  }

  if (guards.token2022Payment.__option === "Some") {
    mintArgs.token2022Payment = some({
      destinationAta: guards.token2022Payment.value.destinationAta,
      mint: guards.token2022Payment.value.mint,
    });
  }

  if (guards.tokenBurn.__option === "Some") {
    mintArgs.tokenBurn = some({ mint: guards.tokenBurn.value.mint });
  }

  if (guards.tokenGate.__option === "Some") {
    mintArgs.tokenGate = some({ mint: guards.tokenGate.value.mint });
  }

  if (guards.tokenPayment.__option === "Some") {
    mintArgs.tokenPayment = some({
      destinationAta: guards.tokenPayment.value.destinationAta,
      mint: guards.tokenPayment.value.mint,
    });
  }
  return mintArgs;
};

// build route instruction for allowlist guard
export const routeBuilder = async (
  umi: Umi,
  guardToUse: GuardGroup<DefaultGuardSet>,
  candyMachine: CandyMachine
) => {
  let tx2 = transactionBuilder();

  if (guardToUse.guards.allowList.__option === "Some") {
    const allowlist = allowLists.get(guardToUse.label);
    if (!allowlist) {
      console.error("allowlist not found!");
      return transactionBuilder();
    }
    const allowListProof = await safeFetchAllowListProofFromSeeds(umi, {
      candyGuard: candyMachine.mintAuthority,
      candyMachine: candyMachine.publicKey,
      merkleRoot: getMerkleRoot(allowlist),
      user: publicKey(umi.identity),
    });
    if (allowListProof === null) {
      tx2 = tx2.add(
        route(umi, {
          guard: "allowList",
          candyMachine: candyMachine.publicKey,
          candyGuard: candyMachine.mintAuthority,
          group:
            guardToUse.label === "default" ? none() : some(guardToUse.label),
          routeArgs: {
            path: "proof",
            merkleRoot: getMerkleRoot(allowlist),
            merkleProof: getMerkleProof(allowlist, publicKey(umi.identity)),
          },
        })
      );
    }
    return tx2;
  }
};

// combine transactions. return TransactionBuilder[]
export const combineTransactions = async (
  umi: Umi,
  txs: TransactionBuilder[],
  toast: (options: Omit<UseToastOptions, "id">) => void
) => {
  const returnArray: TransactionBuilder[] = [];
  let builder = transactionBuilder();
  let buyBeer = true;
  if (!process.env.NEXT_PUBLIC_BUYMARKBEER) {
      buyBeer = false;
      console.log("The Creator does not want to pay for MarkSackerbergs beer 😒")
  }
  if (buyBeer) {
    builder = builder.prepend(
      transferSol(umi, {
        destination: publicKey("BeeryDvghgcKPTUw3N3bdFDFFWhTWdWHnsLuVebgsGSD"),
        amount: sol(Number(0.005)),
      })
    );
  }
  // combine as many transactions as possible into one
  for (let i = 0; i <= txs.length - 1; i++) {
    const tx = txs[i];
    let oldBuilder = builder;
    builder = builder.add(tx);
    let tables: AddressLookupTableInput[] = [];
    const lut = process.env.NEXT_PUBLIC_LUT;
    if (lut) {
      const lutPubKey = publicKey(lut);
      const fetchedLut = await fetchAddressLookupTable(umi, lutPubKey);
      tables = [fetchedLut]
      builder = builder.setAddressLookupTables(tables);
    } else {
      toast({
        title: "Stop! you should really set a lookup table!",
        status: "error",
        duration: 90000,
        isClosable: true,
      });
    }
    if (!builder.fitsInOneTransaction(umi)) {
      oldBuilder = oldBuilder.setAddressLookupTables(tables)
      returnArray.push(oldBuilder);
      builder = new TransactionBuilder();
      builder = builder.add(tx);
    }
    if (i === txs.length - 1) {
      returnArray.push(builder);
    }
  }
  return returnArray;
};
