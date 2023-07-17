import { CandyGuard, CandyMachine, mintV2 } from "@metaplex-foundation/mpl-candy-machine";
import { GuardReturn } from "../utils/checkerHelper";
import { PublicKey, Umi, createBigInt, generateSigner, none, publicKey, some, transactionBuilder } from "@metaplex-foundation/umi";
import { DigitalAssetWithToken } from "@metaplex-foundation/mpl-token-metadata";
import { mintText } from "../settings";
import { Box, Button, Flex, HStack, Heading, SimpleGrid, Text, Tooltip, UseToastOptions } from "@chakra-ui/react";
import { setComputeUnitLimit } from "@metaplex-foundation/mpl-toolbox";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { chooseGuardToUse, routeBuilder, mintArgsBuilder, combineTransactions, GuardButtonList } from "../utils/mintHelper";
import { useSolanaTime } from "@/utils/SolanaTimeContext";

const mintClick = async (
    umi: Umi,
    guard: GuardReturn,
    candyMachine: CandyMachine,
    candyGuard: CandyGuard,
    ownedTokens: DigitalAssetWithToken[],
    toast: (options: Omit<UseToastOptions, "id">) => void,
    setMintsCreated: Dispatch<SetStateAction<PublicKey[]>>,
    guardList: GuardReturn[],
    setGuardList: Dispatch<SetStateAction<GuardReturn[]>>,
    onOpen: () => void
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
        //find the guard by guardToUse.label and set minting to true
        const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
        if (guardIndex === -1) {
            console.error("guard not found");
            return;
        }
        const newGuardList = [...guardList];
        newGuardList[guardIndex].minting = false;
        setGuardList(newGuardList);
    }
};
// new component called timer that calculates the remaining Time based on the bigint solana time and the bigint toTime difference.
const Timer = ({ solanaTime, toTime, setCheckEligibility }: { solanaTime: bigint, toTime: bigint, setCheckEligibility:Dispatch<SetStateAction<boolean>> }) => {
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
    setMintsCreated: Dispatch<SetStateAction<PublicKey[]>>;
    onOpen: () => void;
    setCheckEligibility:Dispatch<SetStateAction<boolean>>;
};

export function ButtonList({
    umi,
    guardList,
    candyMachine,
    candyGuard,
    ownedTokens = [], // provide default empty array
    setGuardList,
    toast,
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
            tooltip: guard.reason
        };
        console.log(guard.reason)
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
                        buttonGuard.endTime > createBigInt(0) && buttonGuard.endTime - solanaTime > createBigInt(0) &&
                        <><Text fontSize="sm" marginRight={"2"} >Ending in: </Text><Timer toTime={buttonGuard.endTime} solanaTime={solanaTime} setCheckEligibility={setCheckEligibility} /></>
                    }
                    {
                        buttonGuard.startTime > createBigInt(0) && buttonGuard.startTime - solanaTime > createBigInt(0) &&
                        <><Text fontSize="sm" marginRight={"2"} >Starting in: </Text><Timer toTime={buttonGuard.startTime} solanaTime={solanaTime} setCheckEligibility={setCheckEligibility}/></>
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
                                setMintsCreated,
                                guardList,
                                setGuardList,
                                onOpen
                            )
                        }
                        key={buttonGuard.label}
                        size="sm"
                        backgroundColor="teal.100"
                        isDisabled={!buttonGuard.allowed}
                        isLoading={
                            guardList.find((elem) => elem.label === buttonGuard.label)?.minting
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