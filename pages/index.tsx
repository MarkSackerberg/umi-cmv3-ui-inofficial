import Head from "next/head";
import { NavBar } from "@/components/nav";
import {
  PublicKey,
  publicKey,
} from "@metaplex-foundation/umi";
import { DigitalAssetWithToken, JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { useEffect, useMemo, useState } from "react";
import { useUmi } from "../utils/useUmi";
import styles from "../styles/Home.module.css";
import { guardChecker } from "../utils/checkAllowed";
import { Center, Card, CardHeader, CardBody, StackDivider, Heading, Stack, useToast, Text, Skeleton, useDisclosure, Button, Modal, ModalBody, ModalCloseButton, ModalContent, Image, ModalHeader, ModalOverlay, Box, Divider, VStack, Flex, Input } from '@chakra-ui/react';
import { ButtonList } from "../components/mintButton";
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { InitializeModal } from "../components/initializeModal";
import { image, headerText } from "../settings";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import { useCandyMachine } from "@/hooks";
import { MainContainer } from "@/components/containers";

import { PrimaryButton } from "@/components/buttons";

export interface IsMinting {
  label: string;
  minting: boolean;
}


export default function Home() {
  const umi = useUmi();
  const solanaTime = useSolanaTime();
  const toast = useToast();

  const {
    isOpen: isMintPaymentOpen,
    onOpen: onMintPaymentOpen,
    onClose: onMintPaymentClose,
  } = useDisclosure();

  const [mintsCreated, setMintsCreated] = useState<
    | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
    | undefined
  >();

  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "startDefault", allowed: false },
  ]);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);

  if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
    console.error("No candy machine in .env!");
    /*
    if (!toast.isActive('no-cm')) {
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
    }
    */
  }

  const candyMachineId: PublicKey = useMemo(() => {
    if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
    } else {
      console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
      /*
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
      */
      return publicKey("11111111111111111111111111111111");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { candyMachine, candyGuard } = useCandyMachine(
    umi,
    candyMachineId,
    checkEligibility,
    setCheckEligibility
  );

  useEffect(() => {
    const checkEligibility = async () => {
      if (candyMachine === undefined || !candyGuard || !checkEligibility) {
        return;
      }

      const { guardReturn, ownedTokens } = await guardChecker(
        umi,
        candyGuard,
        candyMachine,
        solanaTime
      );

      setOwnedTokens(ownedTokens);
      setGuards(guardReturn);
      setIsAllowed(false);

      let allowed = false;
      for (const guard of guardReturn) {
        if (guard.allowed) {
          allowed = true;
          break;
        }
      }

      setIsAllowed(allowed);
      setLoading(false);
    };

    checkEligibility();
    // On purpose: not check for candyMachine, candyGuard, solanaTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umi, checkEligibility]);

  const handleMint = () => {

    console.log('[handleMint]');
  }

  return (
    <>
      <Head>
        <title>Kyogen mint</title>
        <meta name="description" content="Kyogen description" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <NavBar />

      <Box
        w="100vw"
        h="100vh"
        bgImage={"/assets/background.png"}
        bgSize="cover"
        bgPosition="center"
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
      >
        <MainContainer justifyContent="space-between" w="600px" h="600px">
          <Text textAlign="center">Welcome to Kyogen Clash mint</Text>

          <PrimaryButton disabled={isAllowed} onClick={onMintPaymentOpen}>Mint</PrimaryButton>
        </MainContainer>

        <Modal isOpen={isMintPaymentOpen} onClose={onMintPaymentClose}>
          <ModalOverlay/>
          <ModalContent pt="20" maxW="900px" bg="transparent">
            <Flex justifyContent="space-around" gap="2px" alignItems="center">
              <MainContainer justifyContent="space-between" w="410px" h="520px">
                <Text>Your wallet</Text>
                <PrimaryButton onClick={onMintPaymentOpen}>Mint</PrimaryButton>
              </MainContainer>
              <MainContainer justifyContent="space-between" w="410px" h="520px">
                <Text>Coinflow</Text>
                <PrimaryButton onClick={onMintPaymentOpen}>Proceed to checkout</PrimaryButton>
              </MainContainer>
            </Flex>
          </ModalContent>
        </Modal>

      </Box>

    </>
  );
}
