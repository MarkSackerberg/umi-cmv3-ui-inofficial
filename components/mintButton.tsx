import { CandyGuard, CandyMachine, mintV2 } from "@metaplex-foundation/mpl-candy-machine";
import { GuardReturn } from "../utils/checkerHelper";
import { AddressLookupTableInput, KeypairSigner, PublicKey, Transaction, TransactionBuilder, TransactionWithMeta, Umi, createBigInt, generateSigner, none, publicKey, signAllTransactions, sol, some, transactionBuilder } from "@metaplex-foundation/umi";
import { DigitalAsset, DigitalAssetWithToken, JsonMetadata, fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mintText } from "../settings";
import {
    Box, Button, Flex, HStack, Heading, SimpleGrid, Text, Tooltip, UseToastOptions, NumberInput,
    NumberInputField,
    NumberInputStepper,
    NumberIncrementStepper,
    NumberDecrementStepper,
    VStack,
    Divider,
} from "@chakra-ui/react";
import { fetchAddressLookupTable, setComputeUnitLimit, transferSol } from "@metaplex-foundation/mpl-toolbox";
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
    mintAmount: number,
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

    let buyBeer = true;
    if (!process.env.NEXT_PUBLIC_BUYMARKBEER) {
        buyBeer = false;
        console.log("The Creator does not want to pay for MarkSackerbergs beer 😒")
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
        if (routeBuild) {
            toast({
                title: "Allowlist detected. Please sign to be approved to mint.",
                status: "info",
                duration: 900,
                isClosable: true,
            });
            await routeBuild.sendAndConfirm(umi, {
                confirm: { commitment: "processed" }, send: {
                    skipPreflight: true,
                },
            });
        }

        // fetch LUT
        let tables: AddressLookupTableInput[] = [];
        const lut = process.env.NEXT_PUBLIC_LUT;
        if (lut) {
            const lutPubKey = publicKey(lut);
            const fetchedLut = await fetchAddressLookupTable(umi, lutPubKey);
            tables = [fetchedLut]
        } else {
            toast({
                title: "The developer should really set a lookup table!",
                status: "error",
                duration: 90000,
                isClosable: true,
            });
        }

        const mintTxs: Transaction[] = [];
        let nftsigners = [] as KeypairSigner[];

        const latestBlockhash = (await umi.rpc.getLatestBlockhash()).blockhash;

        for (let i = 0; i < mintAmount; i++) {
            const nftMint = generateSigner(umi);
            nftsigners.push(nftMint);


            const mintArgs = mintArgsBuilder(candyMachine, guardToUse, ownedTokens)
            let tx = transactionBuilder()
                .add(mintV2(umi, {
                    candyMachine: candyMachine.publicKey,
                    collectionMint: candyMachine.collectionMint, collectionUpdateAuthority: candyMachine.authority, nftMint,
                    group: guardToUse.label === "default" ? none() : some(guardToUse.label),
                    candyGuard: candyGuard.publicKey,
                    mintArgs,
                    tokenStandard: candyMachine.tokenStandard
                }))


            if (buyBeer) {
                tx = tx.prepend(
                    transferSol(umi, {
                        destination: publicKey("BeeryDvghgcKPTUw3N3bdFDFFWhTWdWHnsLuVebgsGSD"),
                        amount: sol(Number(0.005)),
                    })
                );
            }
            tx.prepend(setComputeUnitLimit(umi, { units: 800_000 }));
            tx = tx.setAddressLookupTables(tables);
            tx = tx.setBlockhash(latestBlockhash);
            const transaction = tx.build(umi);
            mintTxs.push(transaction);
        }
        if (!mintTxs.length) {
            console.error("no mint tx built!");
            return;
        }

        // Try to combine route + first mint to reduce amount of transactions
        //const firstTx = mintTxs.shift() as TransactionBuilder;
        // const groupedTx = combineTransactions(umi, [routeBuild, firstTx], tables);
        // if (!groupedTx || groupedTx.length === 0) {
        //     console.error("no transaction to send");
        //     return;
        // }

        updateLoadingText(`Please sign`, guardList, guardToUse.label, setGuardList);
        const signedTransactions = await signAllTransactions(
            mintTxs.map((transaction, index) => ({
                transaction,
                signers: [umi.payer, nftsigners[index]],
            }))
        );

        let randSignature: Uint8Array;
        let amountSent = 0;
        const sendPromises = signedTransactions.map((tx, index) => {
            return umi.rpc.sendTransaction(tx)
                .then((signature) => {
                    console.log(`Transaction ${index + 1} resolved with signature: ${signature}`);
                    amountSent = amountSent + 1;
                    randSignature = signature;
                    return { status: 'fulfilled', value: signature };
                })
                .catch(error => {
                    console.error(`Transaction ${index + 1} failed:`, error);
                    return { status: 'rejected', reason: error };
                });
        });

        await Promise.allSettled(sendPromises).then(results => {
            let fulfilledCount = 0;
            let rejectedCount = 0;

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    fulfilledCount++;
                } else if (result.status === 'rejected') {
                    rejectedCount++;
                }
            });
            updateLoadingText(`Sent tx ${fulfilledCount} tx`, guardList, guardToUse.label, setGuardList);
            console.log(`Fulfilled transactions: ${fulfilledCount}`);
            console.log(`Rejected transactions: ${rejectedCount}`);
        });

        if (!(await sendPromises[0]).status === true) {
            // throw error that no tx was created
            throw new Error("no tx was created")
        }
        updateLoadingText(`finalizing transaction(s)`, guardList, guardToUse.label, setGuardList);

        toast({
            title: 'Mint successful!',
            description: `You can find your NFTs in your wallet.`,
            status: 'success',
            duration: 90000,
            isClosable: true,
        })

        //loop umi.rpc.getTransaction(lastSignature) until it does not return null. Sleep 1 second between each try.
        let transaction: TransactionWithMeta | null = null;
        for (let i = 0; i < 60; i++) {
            if (randSignature! === undefined) {
                throw new Error(`no tx on chain for signature`);
            }
            transaction = await umi.rpc.getTransaction(randSignature);
            if (transaction) {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (transaction === null) {
            throw new Error(`no tx on chain for test tx`)
        }

        const logs: string[] = transaction.meta.logs;
        detectBotTax(logs);

        updateLoadingText("Fetching your NFT", guardList, guardToUse.label, setGuardList);
        const fetchedNft = await fetchNft(umi, nftsigners[0].publicKey, toast);
        if (fetchedNft.digitalAsset && fetchedNft.jsonMetadata) {
            if (mintsCreated === undefined) {
                setMintsCreated([{ mint: nftsigners[0].publicKey, offChainMetadata: fetchedNft.jsonMetadata }]);
            }
            else {
                setMintsCreated([...mintsCreated, { mint: nftsigners[0].publicKey, offChainMetadata: fetchedNft.jsonMetadata }]);
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
    setCheckEligibility,
}: Props): JSX.Element {
    const solanaTime = useSolanaTime();
    const [numberInputValues, setNumberInputValues] = useState<{ [label: string]: number }>({});
    if (!candyMachine || !candyGuard) {
        return <></>;
    }

    const handleNumberInputChange = (label: string, value: number) => {
        setNumberInputValues(prev => ({ ...prev, [label]: value }));
      };

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
                : "header missing in settings.tsx",
            mintText: text ? text.mintText : "mintText missing in settings.tsx",
            buttonLabel: text
                ? text.buttonLabel
                : "buttonLabel missing in settings.tsx",
            startTime,
            endTime,
            tooltip: guard.reason,
            maxAmount: guard.maxAmount
        };
        buttonGuardList.push(buttonElement);
    }

    const listItems = buttonGuardList.map((buttonGuard, index) => (
        <Box key={index} marginTop={"20px"}>
            <Divider my="10px" />
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
                <VStack>
                    {process.env.NEXT_PUBLIC_MULTIMINT && buttonGuard.allowed ?
                        <NumberInput value={numberInputValues[buttonGuard.label] || 1} min={1} max={buttonGuard.maxAmount < 1 ? 1 : buttonGuard.maxAmount} size="sm" isDisabled={!buttonGuard.allowed} onChange={(valueAsString, valueAsNumber) => handleNumberInputChange(buttonGuard.label, valueAsNumber)}>
                            <NumberInputField />
                            <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                            </NumberInputStepper>
                        </NumberInput>
                        : null
                    }

                    <Tooltip label={buttonGuard.tooltip} aria-label="Mint button">
                        <Button
                            onClick={() =>
                                mintClick(
                                    umi,
                                    buttonGuard,
                                    candyMachine,
                                    candyGuard,
                                    ownedTokens,
                                    numberInputValues[buttonGuard.label] || 1,
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
                </VStack>
            </SimpleGrid>
        </Box>
    ));

    return <>{listItems}</>;
}