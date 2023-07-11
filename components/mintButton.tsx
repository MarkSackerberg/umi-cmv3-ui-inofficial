import { CandyGuard, CandyMachine, DefaultGuardSet, DefaultGuardSetMintArgs, GuardGroup, getMerkleProof, getMerkleRoot, mintV2, route } from "@metaplex-foundation/mpl-candy-machine";
import { GuardReturn } from "../utils/checkerHelper";
import { TransactionBuilder, Umi, generateSigner, none, publicKey, some, transactionBuilder } from "@metaplex-foundation/umi";
import { DigitalAssetWithToken, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { mintText } from "../mintText";
import { Box, Button, Heading, SimpleGrid, Text, UseToastOptions } from "@chakra-ui/react";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { allowLists } from "./../allowlist";

interface GuardList extends GuardReturn {
    header: string;
    mintText: string;
    buttonLabel: string;
}

const chooseGuardToUse = (
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

const mintArgsBuilder = (candyMachine: CandyMachine, guardToUse: GuardGroup<DefaultGuardSet>, ownedTokens: DigitalAssetWithToken[]
) => {
    const guards = guardToUse.guards;
    let ruleset = undefined;
    if (candyMachine.ruleSet.__option === "Some") {
        ruleset = candyMachine.ruleSet.value
    }

    let mintArgs: Partial<DefaultGuardSetMintArgs> = {};
    if (guards.allocation.__option === "Some") {
        mintArgs.allocation = some({ id: guards.allocation.value.id })
    }

    if (guards.allowList.__option === "Some") {
        const allowlist = allowLists.get(guardToUse.label)
        if (!allowlist) {
            console.error(`allowlist for guard ${guardToUse.label} not found!`);
        } else {
            mintArgs.allowList = some({ merkleRoot: getMerkleRoot(allowlist) });
            //TODO: add route instruction!
        }
    }

    if (guards.freezeSolPayment.__option === "Some") {
        mintArgs.freezeSolPayment = some({ destination: guards.freezeSolPayment.value.destination });
    }

    if (guards.freezeTokenPayment.__option === "Some") {
        mintArgs.freezeTokenPayment = some({ destinationAta: guards.freezeTokenPayment.value.destinationAta, mint: guards.freezeTokenPayment.value.mint, nftRuleSet: ruleset });
    }

    if (guards.gatekeeper.__option === "Some") {
        mintArgs.gatekeeper = some({ expireOnUse: guards.gatekeeper.value.expireOnUse, gatekeeperNetwork: guards.gatekeeper.value.gatekeeperNetwork })
    }

    if (guards.mintLimit.__option === "Some") {
        mintArgs.mintLimit = some({ id: guards.mintLimit.value.id })
    }

    if (guards.nftBurn.__option === "Some") {
        const requiredCollection = guards.nftBurn.value.requiredCollection;
        //TODO: have the use choose the NFT
        const nft = ownedTokens.find(
            (el) =>
                el.metadata.collection.__option === "Some" &&
                el.metadata.collection.value.key === requiredCollection
        )
        if (!nft) {
            console.error("no nft to burn found!");
        } else {
            let tokenStandard = TokenStandard.NonFungible;
            if (nft.metadata.tokenStandard.__option === "Some") {
                if (nft.metadata.tokenStandard.value === TokenStandard.ProgrammableNonFungible) {
                    tokenStandard = TokenStandard.ProgrammableNonFungible;
                }
            }
            mintArgs.nftBurn = some({ mint: nft.publicKey, requiredCollection, tokenStandard })
        }
    }

    if (guards.nftGate.__option === "Some") {
        const requiredCollection = guards.nftGate.value.requiredCollection;
        const nft = ownedTokens.find(
            (el) =>
                el.metadata.collection.__option === "Some" &&
                el.metadata.collection.value.key === requiredCollection
        )
        if (!nft) {
            console.error("no nft for tokenGate found!");
        } else {
            let tokenStandard = TokenStandard.NonFungible;
            if (nft.metadata.tokenStandard.__option === "Some") {
                if (nft.metadata.tokenStandard.value === TokenStandard.ProgrammableNonFungible) {
                    tokenStandard = TokenStandard.ProgrammableNonFungible;
                }
            }
            mintArgs.nftGate = some({ mint: nft.publicKey, requiredCollection, tokenStandard })
        }
    }

    if (guards.nftPayment.__option === "Some") {
        const requiredCollection = guards.nftPayment.value.requiredCollection;
        const nft = ownedTokens.find(
            (el) =>
                el.metadata.collection.__option === "Some" &&
                el.metadata.collection.value.key === requiredCollection
        )
        if (!nft) {
            console.error("no nft for tokenGate found!");
        } else {
            let tokenStandard = TokenStandard.NonFungible;
            if (nft.metadata.tokenStandard.__option === "Some") {
                if (nft.metadata.tokenStandard.value === TokenStandard.ProgrammableNonFungible) {
                    tokenStandard = TokenStandard.ProgrammableNonFungible;
                }
            }
            mintArgs.nftPayment = some({ destination: guards.nftPayment.value.destination, mint: nft.publicKey, requiredCollection, tokenStandard })
        }
    }

    if (guards.solPayment.__option === "Some") {
        mintArgs.solPayment = some({ destination: guards.solPayment.value.destination });
    }

    if (guards.thirdPartySigner.__option === "Some") {
        console.error("not supported. you need a backend")
    }

    if (guards.token2022Payment.__option === "Some") {
        mintArgs.token2022Payment = some({ destinationAta: guards.token2022Payment.value.destinationAta, mint: guards.token2022Payment.value.mint });
    }

    if (guards.tokenBurn.__option === "Some") {
        mintArgs.tokenBurn = some({ mint: guards.tokenBurn.value.mint });
    }

    if (guards.tokenGate.__option === "Some") {
        mintArgs.tokenGate = some({ mint: guards.tokenGate.value.mint });
    }

    if (guards.tokenPayment.__option === "Some") {
        mintArgs.tokenPayment = some({ destinationAta: guards.tokenPayment.value.destinationAta, mint: guards.tokenPayment.value.mint });
    }
    return mintArgs;
}




const mintClick = async (
    umi: Umi,
    guard: GuardReturn,
    candyMachine: CandyMachine,
    candyGuard: CandyGuard,
    ownedTokens: DigitalAssetWithToken[],
    toast: (options: Omit<UseToastOptions, "id">) => void
) => {

    const guardToUse = chooseGuardToUse(guard, candyGuard);
    if (!guardToUse.guards) {
        console.error("no guard defined!");
        return;
    }



    const nftMint = generateSigner(umi);

    const mintArgs = mintArgsBuilder(candyMachine, guardToUse, ownedTokens)

    const tx = transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 800_000 }))
        .add(mintV2(umi, {
            candyMachine: candyMachine.publicKey,
            collectionMint: candyMachine.collectionMint, collectionUpdateAuthority: candyMachine.authority, nftMint,
            group: guardToUse.label === "default" ? none() : some(guardToUse.label),
            candyGuard: candyGuard.publicKey,
            mintArgs,
            tokenStandard: candyMachine.tokenStandard
        }))

    try {

        const { signature } = await tx.sendAndConfirm(umi, {
            confirm: { commitment: "finalized" }, send: {
                skipPreflight: true,
            },
        });
    } catch (e) {
        console.error(`minting failed because of ${e}`);

        toast({
            title: 'Your mint failed!',
            description: "Please try again.",
            status: 'error',
            duration: 9000,
            isClosable: true,
        })
    }
};

type Props = {
    umi: Umi;
    guardList: GuardReturn[];
    candyMachine: CandyMachine | undefined;
    candyGuard: CandyGuard | undefined;
    ownedTokens: DigitalAssetWithToken[] | undefined;
    toast: (options: Omit<UseToastOptions, "id">) => void;
};

export function ButtonList({
    umi,
    guardList,
    candyMachine,
    candyGuard,
    ownedTokens,
    toast
}: Props): JSX.Element {
    if (!candyMachine || !candyGuard || !ownedTokens) {
        return <></>;
    }


    // Guard "default" can only be used to mint in case no other guard exists
    let filteredGuardlist = guardList;
    if (guardList.length > 1) {
        filteredGuardlist = guardList.filter((elem) => elem.label != "default");
    }
    let buttonGuardList = [];
    for (const guard of filteredGuardlist) {
        const text = mintText.find((elem) => elem.label === guard.label);
        let buttonElement: GuardList = {
            label: guard ? guard.label : "default",
            allowed: guard.allowed,
            header: text
                ? text.header
                : "header missing in mintText.tsx",
            mintText: text ? text.mintText : "mintText missing in mintText.tsx",
            buttonLabel: text
                ? text.buttonLabel
                : "buttonLabel missing in mintText.tsx",
        };
        buttonGuardList.push(buttonElement);
    }


    //TODO: Placeholder for start + end time?
    //TODO: isLoading when minting
    const listItems = buttonGuardList.map((buttonGuard) => (
        <>
            <Box key={buttonGuard.buttonLabel}>
                <Heading size='xs' textTransform='uppercase'>
                    {buttonGuard.header}
                </Heading>
                <SimpleGrid columns={2} spacing={5}>
                    <Text pt='2' fontSize='sm'>
                        {buttonGuard.mintText}
                    </Text>
                    <Button onClick={() =>
                        mintClick(umi, buttonGuard, candyMachine, candyGuard, ownedTokens, toast)
                    } key={buttonGuard.label} size="sm" backgroundColor='teal.100' isDisabled={!buttonGuard.allowed} isLoading={false} >{buttonGuard.buttonLabel}</Button>
                </SimpleGrid>
            </Box>
        </>
    ));

    return <>{listItems}</>;
}

