import {
  PublicKey,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi";
import { DigitalAssetWithToken } from "@metaplex-foundation/mpl-token-metadata";
import { Inter } from "@next/font/google";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useUmi } from "@/utils/useUmi";
import { fetchCandyMachine, safeFetchCandyGuard, CandyGuard, CandyMachine } from "@metaplex-foundation/mpl-candy-machine"
import styles from "@/styles/Home.module.css";
import { guardChecker } from "@/utils/checkAllowed";
import { Card, CardHeader, CardBody, StackDivider, Heading, Stack, useToast, Spinner } from '@chakra-ui/react';
import { ButtonList } from "@/components/mintButton";
import { GuardReturn } from "@/utils/checkerHelper";

const inter = Inter({ subsets: ["latin"] });

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const useCandyMachine = (umi: Umi, candyMachineId: string) => {
  const [loading, setLoading] = useState(true);
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();
  const toast =  useToast();


  useEffect(() => {
    (async () => {
      if (!candyMachineId) {
        console.error("No candy machine in .env!");
        if (!toast.isActive("no-cm")) {
          toast({
            id: "no-cm",
            title: "No candy machine in .env!",
            description: "Add your candy machine address to the .env file!",
            status: "error",
            duration: 999999,
            isClosable: true,
          });
        }
        return;
      }

      let candyMachine;
      try {
        candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineId));
        console.log("loading candyMachine");
        console.log(candyMachine);
      } catch (e) {
        console.error(e);
        toast({
          id: "no-cm-found",
          title: "The CM from .env is invalid",
          description: "Are you using the correct environment?",
          status: "error",
          duration: 999999,
          isClosable: true,
        });
      }
      setCandyMachine(candyMachine);
      if (!candyMachine) {
        return;
      }
      let candyGuard;
      try {
        candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority);
        console.log("candyGuard");
        console.log(candyGuard);
      } catch (e) {
        console.error(e);
        toast({
          id: "no-guard-found",
          title: "No Candy Guard found!",
          description: "Do you have one assigned?",
          status: "error",
          duration: 999999,
          isClosable: true,
        });
      }
      if (!candyGuard) {
        return;
      }
      setCandyGuard(candyGuard);
      setLoading(false);
    })();
  }, []);

  return { loading, candyMachine, candyGuard };
};


export default function Home() {
  const umi = useUmi();
  const toast = useToast()
  const [mintCreated, setMintCreated] = useState<PublicKey | null>(null);
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "startDefault", allowed: false },
  ]);

  if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
    console.error("No candy machine in .env!")
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
  }
  const candyMachineId: PublicKey = useMemo(() => {
    console.log("candyMachineId")
    console.log(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID)

    if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
    } else {
      console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
      toast({
        id: 'no-cm',
        title: 'No candy machine in .env!',
        description: "Add your candy machine address to the .env file!",
        status: 'error',
        duration: 999999,
        isClosable: true,
      })
      return publicKey("11111111111111111111111111111111");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { loading, candyMachine, candyGuard } = useCandyMachine(umi, candyMachineId);

  useEffect(() => {
    const checkEligibility = async () => {
      if (candyMachine === undefined || !candyGuard) {
        return;
      }

      const { guardReturn, ownedTokens } = await guardChecker(
        umi, candyGuard, candyMachine
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
    };

    checkEligibility();
  }, [candyMachine, candyGuard, umi]);


  const PageContent = () => {
    if (mintCreated) {
      return (
        <a
          className={styles.success}
          target="_blank"
          href={
            "https://www.solaneyes.com/address/" +
            publicKey(mintCreated) +
            "?cluster=devnet"
          }
          rel="noreferrer"
        >
          <div>
            <p>
              <strong>NFT Created</strong> at the following address
            </p>
            <p>
              <code>{publicKey(mintCreated)}</code>
            </p>
          </div>
        </a>
      );
    }

    return (
      <Card>
        <CardHeader>
          <Heading size='md'>Mark&apos;s mint UI</Heading>
        </CardHeader>

        <CardBody>
          <Stack divider={<StackDivider />} spacing='4'>
            {loading ? (
              <Spinner />
            ) : (
              <ButtonList
                guardList={guards}
                candyMachine={candyMachine}
                candyGuard={candyGuard}
                umi={umi}
                ownedTokens={ownedTokens}
                toast={toast} 
              />
            )}
          </Stack>
        </CardBody>
      </Card>
    );
  };

  return (
    <>
      <Head>
        <title>Mint UI by MarkSackerberg</title>
        <meta name="description" content="Mint UI by MarkSackerberg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={inter.className}>
        <div className={styles.wallet}>
          <WalletMultiButtonDynamic />
        </div>

        <div className={styles.center}>
          <PageContent key="content" />
        </div>
      </main>
    </>
  );
}
