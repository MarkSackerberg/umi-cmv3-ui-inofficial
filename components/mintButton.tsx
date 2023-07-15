import { CandyGuard, CandyMachine, mintV2 } from "@metaplex-foundation/mpl-candy-machine";
import { GuardReturn } from "../utils/checkerHelper";
import { PublicKey, Umi, generateSigner, none, publicKey, some, transactionBuilder } from "@metaplex-foundation/umi";
import { DigitalAssetWithToken } from "@metaplex-foundation/mpl-token-metadata";
import { mintText } from "../settings";
import { Box, Button, Divider, Heading, SimpleGrid, Text, Tooltip, UseToastOptions } from "@chakra-ui/react";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { Dispatch, SetStateAction } from "react";
import { IsMinting } from "../pages";
import { chooseGuardToUse, routeBuilder, mintArgsBuilder, combineTransactions, GuardList } from "../utils/mintHelper";



const mintClick = async (
    umi: Umi,
    guard: GuardReturn,
    candyMachine: CandyMachine,
    candyGuard: CandyGuard,
    ownedTokens: DigitalAssetWithToken[],
    toast: (options: Omit<UseToastOptions, "id">) => void,
    setIsMinting: Dispatch<SetStateAction<IsMinting[]>>,
    setMintsCreated: Dispatch<SetStateAction<PublicKey[]>>,
    onOpen: () => void
) => {
    const guardToUse = chooseGuardToUse(guard, candyGuard);
    if (!guardToUse.guards) {
        console.error("no guard defined!");
        return;
    }
    try {
        setIsMinting((prev) => {
            const newIsMinting = [...prev];
            const index = newIsMinting.findIndex((el) => el.label === guardToUse.label);
            if (index !== -1) {
                newIsMinting[index].minting = true;
            } else {
                newIsMinting.push({ label: guardToUse.label, minting: true });
            }
            return newIsMinting;
        });

        let routeBuild = await routeBuilder(umi, guardToUse, candyMachine);
        if (!routeBuild) {
            routeBuild = transactionBuilder();
        }
        const nftMint = generateSigner(umi);

        const mintArgs = mintArgsBuilder(candyMachine, guardToUse, ownedTokens)
        const tx = transactionBuilder()
            .add(mintV2(umi, {
                candyMachine: candyMachine.publicKey,
                collectionMint: candyMachine.collectionMint, collectionUpdateAuthority: candyMachine.authority, nftMint,
                group: guardToUse.label === "default" ? none() : some(guardToUse.label),
                candyGuard: candyGuard.publicKey,
                mintArgs,
                tokenStandard: candyMachine.tokenStandard
            }))

        const groupedTx = await combineTransactions(umi, [routeBuild, tx], toast);
        if (!groupedTx || groupedTx.length === 0) {
            console.error("no transaction to send");
            return;
        }

        if (groupedTx.length > 1) {
            let counter = 0;
            for (let tx of groupedTx) {
                tx = tx.prepend(setComputeUnitLimit(umi, { units: 800_000 }))
                await tx.sendAndConfirm(umi, {
                    confirm: { commitment: "processed" }, send: {
                        skipPreflight: true,
                    },
                });
                if (counter < groupedTx.length - 1) {
                    toast({
                        title: `Transaction ${counter}/${groupedTx.length} successful!`,
                        description: `Please sign the next...`,
                        status: 'success',
                        duration: 90000,
                        isClosable: true,
                    })
                }
            }
        } else {
            let tx = groupedTx[0].prepend(setComputeUnitLimit(umi, { units: 800_000 }))
            await tx.sendAndConfirm(umi, {
                confirm: { commitment: "finalized" }, send: {
                    skipPreflight: true,
                },
            });
        }
        toast({
            title: 'Mint successful!',
            description: `You can find your NFT in your wallet.`,
            status: 'success',
            duration: 90000,
            isClosable: true,
        })
        //setMintsCreated, add the minted nft to the list and make sure that the initial dummy value is removed
        setMintsCreated((prev) => {
            const newMintsCreated = [...prev];
            const index = newMintsCreated.findIndex((el) => el === publicKey("11111111111111111111111111111111"));
            if (index !== -1) {
                newMintsCreated[index] = nftMint.publicKey;
            } else {
                newMintsCreated.push(nftMint.publicKey);
            }
            return newMintsCreated;
        });

        onOpen();

    } catch (e) {
        console.error(`minting failed because of ${e}`);

        toast({
            title: 'Your mint failed!',
            description: "Please try again.",
            status: 'error',
            duration: 9000,
            isClosable: true,
        })
    } finally {
        //set the minting state for the guard to true
        setIsMinting((prev) => {
            const newIsMinting = [...prev];
            const index = newIsMinting.findIndex((el) => el.label === guardToUse.label);
            if (index !== -1) {
                newIsMinting[index].minting = false;
            } else {
                newIsMinting.push({ label: guardToUse.label, minting: false });
            }
            return newIsMinting;
        });
    }
};

type Props = {
    umi: Umi;
    guardList: GuardReturn[];
    candyMachine: CandyMachine | undefined;
    candyGuard: CandyGuard | undefined;
    ownedTokens: DigitalAssetWithToken[] | undefined;
    toast: (options: Omit<UseToastOptions, "id">) => void;
    setIsMinting: Dispatch<SetStateAction<IsMinting[]>>;
    isMinting: IsMinting[];
    setMintsCreated: Dispatch<SetStateAction<PublicKey[]>>;
    onOpen: () => void;
};

export function ButtonList({
    umi,
    guardList,
    candyMachine,
    candyGuard,
    ownedTokens = [], // provide default empty array
    toast,
    setIsMinting,
    isMinting,
    setMintsCreated,
    onOpen
}: Props): JSX.Element {
    if (!candyMachine || !candyGuard) {
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
        // add isMinting state for each button if it doesn't exist yet
        setIsMinting((prev) => {
            if (prev.find((elem) => elem.label === buttonElement.label)) {
                return prev;
            } else {
                return [...prev, { label: buttonElement.label, minting: false }];
            }
        });
    }

    //TODO: Placeholder for start + end time?
    let toolTip = "";
    if (umi.identity.publicKey === publicKey("11111111111111111111111111111111")) {
        toolTip = "Please connect your wallet to mint";
    }
    const listItems = buttonGuardList.map((buttonGuard) => (
        <>
            <Box key={buttonGuard.buttonLabel} marginTop={"20px"}>
                <Heading size='xs' textTransform='uppercase'>
                    {buttonGuard.header}
                </Heading>
                <SimpleGrid columns={2} spacing={5}>
                    <Text pt='2' fontSize='sm'>
                        {buttonGuard.mintText}
                    </Text>
                    <Tooltip label={toolTip} aria-label="Mint button">

                        <Button
                            onClick={() =>
                                mintClick(
                                    umi,
                                    buttonGuard,
                                    candyMachine,
                                    candyGuard,
                                    ownedTokens,
                                    toast,
                                    setIsMinting,
                                    setMintsCreated,
                                    onOpen
                                )
                            }
                            key={buttonGuard.label}
                            size="sm"
                            backgroundColor="teal.100"
                            isDisabled={!buttonGuard.allowed}
                            isLoading={
                                isMinting.find((elem) => elem.label === buttonGuard.label)?.minting
                            }
                        >
                            {buttonGuard.buttonLabel}
                        </Button>
                    </Tooltip>

                </SimpleGrid>
            </Box>
        </>
    ));

    return <>{listItems}</>;
}