import { CandyGuard, CandyMachine, mintV2 } from "@metaplex-foundation/mpl-candy-machine";
import { GuardReturn } from "../utils/checkerHelper";
import { PublicKey, TransactionWithMeta, Umi, createBigInt, generateSigner, none, some, transactionBuilder } from "@metaplex-foundation/umi";
import { DigitalAsset, DigitalAssetWithToken, JsonMetadata, fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mintText } from "../settings";
import { Box, Button, Flex, HStack, Heading, SimpleGrid, Text, Tooltip, UseToastOptions } from "@chakra-ui/react";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { chooseGuardToUse, routeBuilder, mintArgsBuilder, combineTransactions, GuardButtonList } from "../utils/mintHelper";
import { useSolanaTime } from "@/utils/SolanaTimeContext";

const updateLoadingText = (loadingText: string | undefined, guardList: GuardReturn[], label: string, setGuardList: Dispatch<SetStateAction<GuardReturn[]>>,) => {
    const guardIndex = guardList.findIndex((g) => g.label === label);
    if (guardIndex === -1) {
        console.error("guard not found");
        return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].loadingText = loadingText;
    setGuardList(newGuardList);
}

const detectBotTax = (logs: string[]) => {
    if (logs.find((l) => l.includes("Candy Guard Botting"))) {
        throw new Error(`Candy Guard Bot Tax triggered. Check transaction`);
    }
    return false;
}

const fetchNft = async (umi: Umi, nftAdress: PublicKey, toast: (options: Omit<UseToastOptions, "id">) => void) => {
    let digitalAsset: DigitalAsset | undefined;
    let jsonMetadata: JsonMetadata | undefined;
    try {
        digitalAsset = await fetchDigitalAsset(umi, nftAdress);
        jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.metadata.uri)
    } catch (e) {
        console.error(e);
        toast({
            title: 'Nft could not be fetched!',
            description: "Please check your Wallet instead.",
            status: 'error',
            duration: 9000,
            isClosable: true,
        });
    }

    return { digitalAsset, jsonMetadata }
}

const mintClick = async (
    umi: Umi,
    guard: GuardReturn,
    candyMachine: CandyMachine,
    candyGuard: CandyGuard,
    ownedTokens: DigitalAssetWithToken[],
    toast: (options: Omit<UseToastOptions, "id">) => void,
    mintsCreated: {
        mint: PublicKey;
        offChainMetadata: JsonMetadata | undefined;
    }[] | undefined,
    setMintsCreated: Dispatch<SetStateAction<{ mint: PublicKey; offChainMetadata: JsonMetadata | undefined; }[] | undefined>>,
    guardList: GuardReturn[],
    setGuardList: Dispatch<SetStateAction<GuardReturn[]>>,
    onOpen: () => void,
    setCheckEligibility: Dispatch<SetStateAction<boolean>>
) => {
    const guardToUse = chooseGuardToUse(guard, candyGuard);
    if (!guardToUse.guards) {
        console.error("no guard defined!");
        return;
    }
    try {
        //find the guard by guardToUse.label and set minting to true
        const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
        if (guardIndex === -1) {
            console.error("guard not found");
            return;
        }
        const newGuardList = [...guardList];
        newGuardList[guardIndex].minting = true;
        setGuardList(newGuardList);

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

        let lastSignature: Uint8Array | undefined;
        if (groupedTx.length > 1) {
            let counter = 0;
            for (let tx of groupedTx) {
                tx = tx.prepend(setComputeUnitLimit(umi, { units: 800_000 }))
                const { signature } = await tx.sendAndConfirm(umi, {
                    confirm: { commitment: "processed" }, send: {
                        skipPreflight: true,
                    },
                });
                lastSignature = signature;
                if (counter < groupedTx.length - 1) {
                    updateLoadingText(`Transaction ${counter}/${groupedTx.length}`, guardList, guardToUse.label, setGuardList);
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
            updateLoadingText(`Please sign`, guardList, guardToUse.label, setGuardList);
            let tx = groupedTx[0].prepend(setComputeUnitLimit(umi, { units: 800_000 }))
            const { signature } = await tx.sendAndConfirm(umi, {
                confirm: { commitment: "processed" }, send: {
                    skipPreflight: true,
                },
            });
            lastSignature = signature;
        }
        if (!lastSignature) {
            // throw error that no tx was created
            throw new Error("no tx was created")
        }
        updateLoadingText(`finalizing transaction`, guardList, guardToUse.label, setGuardList);

        toast({
            title: 'Mint successful!',
            description: `You can find your NFT in your wallet.`,
            status: 'success',
            duration: 90000,
            isClosable: true,
        })

        //loop umi.rpc.getTransaction(lastSignature) until it does not return null. Sleep 1 second between each try.
        let transaction: TransactionWithMeta | null = null;
        for (let i = 0; i < 30; i++) {
            transaction = await umi.rpc.getTransaction(lastSignature);
            if (transaction) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (transaction === null) {
            throw new Error(`no tx on chain for signature ${lastSignature}`)
        }

        const logs: string[] = transaction.meta.logs;
        detectBotTax(logs);

        updateLoadingText("Fetching your NFT", guardList, guardToUse.label, setGuardList);
        const fetchedNft = await fetchNft(umi, nftMint.publicKey, toast);
        if (fetchedNft.digitalAsset && fetchedNft.jsonMetadata) {
            if (mintsCreated === undefined) {
                setMintsCreated([{ mint: nftMint.publicKey, offChainMetadata: fetchedNft.jsonMetadata }]);
            }
            else {
                setMintsCreated([...mintsCreated, { mint: nftMint.publicKey, offChainMetadata: fetchedNft.jsonMetadata }]);
            }
            onOpen();
        }

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
        //find the guard by guardToUse.label and set minting to true
        const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
        if (guardIndex === -1) {
            console.error("guard not found");
            return;
        }
        const newGuardList = [...guardList];
        newGuardList[guardIndex].minting = false;
        setGuardList(newGuardList);
        setCheckEligibility(true)
        updateLoadingText(undefined, guardList, guardToUse.label, setGuardList);
    }
};
// new component called timer that calculates the remaining Time based on the bigint solana time and the bigint toTime difference.
const Timer = ({ solanaTime, toTime, setCheckEligibility }: { solanaTime: bigint, toTime: bigint, setCheckEligibility: Dispatch<SetStateAction<boolean>> }) => {
    const [remainingTime, setRemainingTime] = useState<bigint>(toTime - solanaTime);
    useEffect(() => {
        const interval = setInterval(() => {
            setRemainingTime((prev) => {
                return prev - BigInt(1);
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    //convert the remaining time in seconds to the amount of days, hours, minutes and seconds left
    const days = remainingTime / BigInt(86400);
    const hours = (remainingTime % BigInt(86400)) / BigInt(3600);
    const minutes = (remainingTime % BigInt(3600)) / BigInt(60);
    const seconds = remainingTime % BigInt(60);
    if (days > BigInt(0)) {
        return <Text fontSize="sm" fontWeight="bold">{days.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}d {hours.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}h {minutes.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}m {seconds.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}s</Text>;
    }
    if (hours > BigInt(0)) {
        return <Text fontSize="sm" fontWeight="bold">{hours.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}h {minutes.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}m {seconds.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}s</Text>;
    }
    if (minutes > BigInt(0) || seconds > BigInt(0)) {
        return <Text fontSize="sm" fontWeight="bold">{minutes.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}m {seconds.toLocaleString('en-US', { minimumIntegerDigits: 2, useGrouping: false })}s</Text>;
    }
    if (remainingTime === BigInt(0)) {
        setCheckEligibility(true);
    }
    return <Text></Text>;
}

type Props = {
    umi: Umi;
    guardList: GuardReturn[];
    candyMachine: CandyMachine | undefined;
    candyGuard: CandyGuard | undefined;
    ownedTokens: DigitalAssetWithToken[] | undefined;
    toast: (options: Omit<UseToastOptions, "id">) => void;
    setGuardList: Dispatch<SetStateAction<GuardReturn[]>>;
    mintsCreated: {
        mint: PublicKey;
        offChainMetadata: JsonMetadata | undefined;
    }[] | undefined;
    setMintsCreated: Dispatch<SetStateAction<{ mint: PublicKey; offChainMetadata: JsonMetadata | undefined; }[] | undefined>>;
    onOpen: () => void;
    setCheckEligibility: Dispatch<SetStateAction<boolean>>;
};

export function ButtonList({
    umi,
    guardList,
    candyMachine,
    candyGuard,
    ownedTokens = [], // provide default empty array
    toast,
    setGuardList,
    mintsCreated,
    setMintsCreated,
    onOpen,
    setCheckEligibility
}: Props): JSX.Element {
    const solanaTime = useSolanaTime();

    if (!candyMachine || !candyGuard) {
        return <></>;
    }
    // remove duplicates from guardList
    //fucked up bugfix
    let filteredGuardlist = guardList.filter((elem, index, self) =>
        index === self.findIndex((t) => (
            t.label === elem.label
        ))
    )
    if (filteredGuardlist.length === 0) {
        return <></>;
    }
    // Guard "default" can only be used to mint in case no other guard exists
    if (filteredGuardlist.length > 1) {
        filteredGuardlist = guardList.filter((elem) => elem.label != "default");
    }
    let buttonGuardList = [];
    for (const guard of filteredGuardlist) {
        const text = mintText.find((elem) => elem.label === guard.label);
        // find guard by label in candyGuard
        const group = candyGuard.groups.find((elem) => elem.label === guard.label);
        let startTime = createBigInt(0);
        let endTime = createBigInt(0);
        if (group) {
            if (group.guards.startDate.__option === "Some") {
                startTime = group.guards.startDate.value.date
            }
            if (group.guards.endDate.__option === "Some") {
                endTime = group.guards.endDate.value.date
            }
        }

        let buttonElement: GuardButtonList = {
            label: guard ? guard.label : "default",
            allowed: guard.allowed,
            header: text
                ? text.header
                : "header missing in mintText.tsx",
            mintText: text ? text.mintText : "mintText missing in mintText.tsx",
            buttonLabel: text
                ? text.buttonLabel
                : "buttonLabel missing in mintText.tsx",
            startTime,
            endTime,
            tooltip: guard.reason,
        };
        buttonGuardList.push(buttonElement);
    }

    const listItems = buttonGuardList.map((buttonGuard, index) => (
        <Box key={index} marginTop={"20px"}>
            <HStack>
                <Heading size='xs' textTransform='uppercase'>
                    {buttonGuard.header}
                </Heading>
                <Flex justifyContent="flex-end" marginLeft="auto">
                    {
                        buttonGuard.endTime > createBigInt(0) && buttonGuard.endTime - solanaTime > createBigInt(0) && (!buttonGuard.startTime || buttonGuard.startTime - solanaTime <= createBigInt(0)) &&
                        <><Text fontSize="sm" marginRight={"2"} >Ending in: </Text><Timer toTime={buttonGuard.endTime} solanaTime={solanaTime} setCheckEligibility={setCheckEligibility} /></>
                    }
                    {
                        buttonGuard.startTime > createBigInt(0) && buttonGuard.startTime - solanaTime > createBigInt(0) && (!buttonGuard.endTime || solanaTime - buttonGuard.endTime <= createBigInt(0)) &&
                        <><Text fontSize="sm" marginRight={"2"} >Starting in: </Text><Timer toTime={buttonGuard.startTime} solanaTime={solanaTime} setCheckEligibility={setCheckEligibility} /></>
                    }
                </Flex>
            </HStack>
            <SimpleGrid columns={2} spacing={5}>
                <Text pt='2' fontSize='sm'>
                    {buttonGuard.mintText}
                </Text>
                <Tooltip label={buttonGuard.tooltip} aria-label="Mint button">

                    <Button
                        onClick={() =>
                            mintClick(
                                umi,
                                buttonGuard,
                                candyMachine,
                                candyGuard,
                                ownedTokens,
                                toast,
                                mintsCreated,
                                setMintsCreated,
                                guardList,
                                setGuardList,
                                onOpen,
                                setCheckEligibility
                            )
                        }
                        key={buttonGuard.label}
                        size="sm"
                        backgroundColor="teal.100"
                        isDisabled={!buttonGuard.allowed}
                        isLoading={
                            guardList.find((elem) => elem.label === buttonGuard.label)?.minting
                        }
                        loadingText={
                            guardList.find((elem) => elem.label === buttonGuard.label)?.loadingText
                        }
                    >
                        {buttonGuard.buttonLabel}
                    </Button>
                </Tooltip>

            </SimpleGrid>
        </Box>
    ));

    return <>{listItems}</>;
}