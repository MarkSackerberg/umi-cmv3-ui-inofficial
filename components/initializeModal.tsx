import { createLutForCandyMachineAndGuard } from "../utils/createLutForCandyGuard";
import { Button, Flex, HStack, NumberDecrementStepper, NumberIncrementStepper, NumberInput, NumberInputField, NumberInputStepper, SimpleGrid, Slider, SliderFilledTrack, SliderThumb, SliderTrack, UseToastOptions, VStack } from "@chakra-ui/react";
import { CandyGuard, CandyMachine, route } from "@metaplex-foundation/mpl-candy-machine";
import { GpaBuilder, Umi, publicKey, sol, some, transactionBuilder } from "@metaplex-foundation/umi";
import { transferSol, addMemo } from '@metaplex-foundation/mpl-toolbox';
import React, { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";

// new function createLUT that is called when the button is clicked and which calls createLutForCandyMachineAndGuard and returns a success toast
const createLut = (umi: Umi, candyMachine: CandyMachine, candyGuard: CandyGuard, recentSlot: number, toast: (options: Omit<UseToastOptions, "id">) => void) => async () => {
    const [builder, AddressLookupTableInput] = await createLutForCandyMachineAndGuard(umi, recentSlot, candyMachine, candyGuard);
    const { signature } = await builder.sendAndConfirm(umi, {
        confirm: { commitment: "processed" }, send: {
            skipPreflight: true,
        }
    });
    toast({
        title: "LUT created",
        description: `LUT ${AddressLookupTableInput.publicKey} created. Add it to your .env NEXT_PUBLIC_LUT NOW! This UI does not work properly without it!`,
        status: "success",
        duration: 99999999,
        isClosable: true,
    });
}

const initializeGuards = (umi: Umi, candyMachine: CandyMachine, candyGuard: CandyGuard, toast: (options: Omit<UseToastOptions, "id">) => void) => async () => {
    if (!candyGuard.groups) {
        return;
    }
    candyGuard.groups.forEach(async (group) => {
        let builder = transactionBuilder();
        if (group.guards.freezeSolPayment.__option === "Some" || group.guards.freezeTokenPayment.__option === "Some") {
            toast({
                title: "FreezeSolPayment",
                description: `Make sure that you ran sugar freeze initialize!`,
                status: "success",
                duration: 99999999,
                isClosable: true,
            });
        }
        if (group.guards.allocation.__option === "Some") {
            builder = builder.add(
                route(umi, {
                    guard: "allocation",
                    candyMachine: candyMachine.publicKey,
                    candyGuard: candyMachine.mintAuthority,
                    group:
                        some(group.label),
                    routeArgs: {
                        candyGuardAuthority: umi.identity,
                        id: group.guards.allocation.value.id,
                    },
                }))

        }
        if (builder.items.length > 0) {
            builder.sendAndConfirm(umi, {
                confirm: { commitment: "processed" }, send: {
                    skipPreflight: true,
                }
            })
            toast({
                title: "routes created",
                status: "success",
                duration: 99999999,
                isClosable: true,
            });
        } else {
            toast({
                title: "Nothing to create here",
                status: "info",
                duration: 99999999,
                isClosable: true,
            });
        }

    });
}

const buyABeer = (umi: Umi, amount: string, toast: (options: Omit<UseToastOptions, "id">) => void) => async () => {
    amount = amount.replace(" SOL", "");

    let builder = transactionBuilder()
        .add(addMemo(umi, { memo: "🍻" }))
        .add(transferSol(umi, { destination: publicKey("BeeryDvghgcKPTUw3N3bdFDFFWhTWdWHnsLuVebgsGSD"), amount: sol(Number(amount)) }))

    try {

        await builder.sendAndConfirm(umi, {
            confirm: { commitment: "processed" }, send: {
                skipPreflight: true,
            }
        });

        toast({
            title: "Thank you! 🍻",
            description: `Lets have a 🍺 together!`,
            status: "success",
            duration: 99999999,
            isClosable: true,
        });

    } catch (e) {
        console.error(e)

    }
}


function BuyABeerInput({ value, setValue }: { value: string, setValue: React.Dispatch<React.SetStateAction<string>> }) {
    const format = (val: string) => val + ' SOL'
    const parse = (val: string) => val.replace(/^\$/, '')

    return (
        <>
            <NumberInput mr='2rem' value={format(value)} onChange={(valueString) => setValue(parse(valueString))} step={0.5} precision={2} keepWithinRange={true} min={0}>
                <NumberInputField />
                <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                </NumberInputStepper>
            </NumberInput>
        </>
    )
}

type Props = {
    umi: Umi;
    candyMachine: CandyMachine;
    candyGuard: CandyGuard | undefined;
    toast: (options: Omit<UseToastOptions, "id">) => void;
};

export const InitializeModal = ({ umi, candyMachine, candyGuard, toast }: Props) => {
    const [recentSlot, setRecentSlot] = useState<number>(0);
    const [amount, setAmount] = useState<string>("5")


    useEffect(() => {
        (async () => {
            setRecentSlot(await umi.rpc.getSlot())
        })();
    }, [umi]);

    if (!candyGuard) {
        console.error("no guard defined!")
        return <></>
    }

    return (
        <><SimpleGrid><VStack>
            <Button onClick={createLut(umi, candyMachine, candyGuard, recentSlot, toast)}>Create LUT</Button>
            <Button onClick={initializeGuards(umi, candyMachine, candyGuard, toast)}>Initialize Guards</Button>
            <HStack>
                <BuyABeerInput value={amount} setValue={setAmount} />
                <Button onClick={buyABeer(umi, amount, toast)}>Buy me a Beer 🍻</Button>
            </HStack>
        </VStack></SimpleGrid></>
    );
}
