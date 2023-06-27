import {
  base58PublicKey,
  createGenericFileFromBrowserFile,
  generateSigner,
  Umi,
  percentAmount,
  PublicKey,
  publicKey,
  some,
  transactionBuilder,
  assertAccountExists,
  lamports,
  amountToNumber,
  Some
} from "@metaplex-foundation/umi";
import { createNft, fetchAllDigitalAssetWithTokenByOwner, fetchDigitalAsset, TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { Inter } from "@next/font/google";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import Head from "next/head";
import { FormEvent, useState } from "react";
import { useUmi } from "../utils/useUmi";
import { fetchCandyMachine, mintV2, safeFetchCandyGuard, DefaultGuardSetMintArgs, findMintCounterPda, AddressGate, BotTax } from "@metaplex-foundation/mpl-candy-machine"
import { fetchTokensByOwner, setComputeUnitLimit } from '@metaplex-foundation/mpl-toolbox';
import styles from "@/styles/Home.module.css";
import { guardChecker } from "@/utils/checkAllowed";
import { Card, CardHeader, CardBody, CardFooter, StackDivider, Heading, Stack, Box, Text, Button } from '@chakra-ui/react'
const inter = Inter({ subsets: ["latin"] });

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);


export default function Home() {
  const wallet = useWallet();
  const umi = useUmi();
  const [loading, setLoading] = useState(false);
  const [mintCreated, setMintCreated] = useState<PublicKey | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);


    try {
      const candyMachine = await fetchCandyMachine(umi, publicKey("375upFCTLSYcjzJdPBXufZkStPGeqSyFZtwoJ5xbywZL"))
      const candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority)

      console.log(candyGuard)
      console.log((candyGuard?.guards.botTax as Some<BotTax>).value.lamports)
      console.log(publicKey((candyGuard?.groups[0].guards.addressGate as Some<AddressGate>).value.address))
      if (!candyGuard) { return }
      if (!guardChecker(umi, candyGuard, candyMachine)) {

      }


      const nftSigner = generateSigner(umi);
      const mintArgs: Partial<DefaultGuardSetMintArgs> = {
        mintLimit: some({ id: 2 }),
      }

      const tx = transactionBuilder()
        .add(setComputeUnitLimit(umi, { units: 600_000 }))
        .add(mintV2(umi, {
          candyMachine: candyMachine.publicKey,
          collectionMint: candyMachine.collectionMint, collectionUpdateAuthority: candyMachine.authority, nftMint: nftSigner,
          //group: some("test"),
          candyGuard: candyGuard?.publicKey,
          mintArgs: mintArgs,
          tokenStandard: TokenStandard.ProgrammableNonFungible
        }))


      const { signature } = await tx.sendAndConfirm(umi, {
        confirm: { commitment: "finalized" }, send: {
          skipPreflight: true,
        },
      });

      const nft = await fetchDigitalAsset(umi, nftSigner.publicKey)
      setMintCreated(nftSigner.publicKey);
    } finally {
      setLoading(false);
    }
  };

  const PageContent = () => {
    if (!wallet.connected) {
      return <p>Please connect your wallet to get started.</p>;
    }

    if (loading) {
      return (
        <div className={styles.loading}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="192"
            height="192"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <rect width="256" height="256" fill="none"></rect>
            <path
              d="M168,40.7a96,96,0,1,1-80,0"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="24"
            ></path>
          </svg>
          <p>Creating the NFT...</p>
        </div>
      );
    }

    if (mintCreated) {
      return (
        <a
          className={styles.success}
          target="_blank"
          href={
            "https://www.solaneyes.com/address/" +
            base58PublicKey(mintCreated) +
            "?cluster=devnet"
          }
          rel="noreferrer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="192"
            height="192"
            fill="currentColor"
            viewBox="0 0 256 256"
          >
            <rect width="256" height="256" fill="none"></rect>
            <polyline
              points="172 104 113.3 160 84 132"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="24"
            ></polyline>
            <circle
              cx="128"
              cy="128"
              r="96"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="24"
            ></circle>
          </svg>
          <div>
            <p>
              <strong>NFT Created</strong> at the following address
            </p>
            <p>
              <code>{base58PublicKey(mintCreated)}</code>
            </p>
          </div>
        </a>
      );
    }

    return (
      <form method="post" onSubmit={onSubmit} className={styles.form}>
        <Card>
          <CardHeader>
            <Heading size='md'>Client Report</Heading>
          </CardHeader>

          <CardBody>
            <Stack divider={<StackDivider />} spacing='4'>
              <Box>
                <Heading size='xs' textTransform='uppercase'>
                  Summary
                </Heading>
                <Text pt='2' fontSize='sm'>
                  View a summary of all your clients over the last month.
                </Text>
              </Box>
              <Box>
                <Heading size='xs' textTransform='uppercase'>
                  Overview
                </Heading>
                <Text pt='2' fontSize='sm'>
                  Check out the overview of your clients.
                </Text>
              </Box>
              <Box>
                <Heading size='xs' textTransform='uppercase'>
                  Analysis
                </Heading>
                <Text pt='2' fontSize='sm'>
                  See a detailed analysis of all your business clients.
                </Text>
                <Button colorScheme='teal200' isLoading type="submit">Button</Button>
              </Box>
            </Stack>
          </CardBody>
        </Card>

        <button type="submit">
          <span>Create NFT</span>
          <svg
            aria-hidden="true"
            role="img"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 448 512"
          >
            <path
              fill="currentColor"
              d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"
            ></path>
          </svg>
        </button>
      </form>
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
          <PageContent />
        </div>
      </main>
    </>
  );
}
