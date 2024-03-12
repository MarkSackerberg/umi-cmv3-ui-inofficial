import { PublicKey, publicKey, Umi } from "@metaplex-foundation/umi";
import {
  DigitalAssetWithToken,
  JsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import dynamic from "next/dynamic";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { useUmi } from "../utils/useUmi";
import {
  fetchCandyMachine,
  safeFetchCandyGuard,
  CandyGuard,
  CandyMachine,
  AccountVersion,
} from "@metaplex-foundation/mpl-candy-machine";
import styles from "../styles/Home.module.css";
import { guardChecker } from "../utils/checkAllowed";
import {
  Center,
  Card,
  CardHeader,
  CardBody,
  StackDivider,
  Heading,
  Stack,
  useToast,
  Text,
  Skeleton,
  useDisclosure,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  // Image,
  ModalHeader,
  ModalOverlay,
  Box,
  Divider,
  VStack,
  Flex,
  Badge,
} from "@chakra-ui/react";
import { ButtonList } from "../components/mintButton";
import { GuardReturn } from "../utils/checkerHelper";
import { ShowNft } from "../components/showNft";
import { InitializeModal } from "../components/initializeModal";
import { image, headerText } from "../settings";
import Image from "next/image";
import BG from "@/public/assets/background.png";
import CollectionLogo from "@/public/assets/collection_logo.png";
import RainbowCard from "@/public/assets/Rainbow.gif";
import Round from "@/public/assets/Round.svg";
import Twitter from "@/public/assets/Twitter.svg";
import Telegram from "@/public/assets/Telegram.svg";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const useCandyMachine = (
  umi: Umi,
  candyMachineId: string,
  checkEligibility: boolean,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>,
  firstRun: boolean,
  setfirstRun: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();
  const toast = useToast();

  useEffect(() => {
    (async () => {
      if (checkEligibility) {
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
          candyMachine = await fetchCandyMachine(
            umi,
            publicKey(candyMachineId)
          );
          //verify CM Version
          if (candyMachine.version != AccountVersion.V2) {
            toast({
              id: "wrong-account-version",
              title: "Wrong candy machine account version!",
              description:
                "Please use latest sugar to create your candy machine. Need Account Version 2!",
              status: "error",
              duration: 999999,
              isClosable: true,
            });
            return;
          }
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
          candyGuard = await safeFetchCandyGuard(
            umi,
            candyMachine.mintAuthority
          );
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
        if (firstRun) {
          setfirstRun(false);
        }
      }
    })();
  }, [umi, checkEligibility]);

  return { candyMachine, candyGuard };
};

export default function Home() {
  const umi = useUmi();
  const toast = useToast();
  const {
    isOpen: isShowNftOpen,
    onOpen: onShowNftOpen,
    onClose: onShowNftClose,
  } = useDisclosure();
  const {
    isOpen: isInitializerOpen,
    onOpen: onInitializerOpen,
    onClose: onInitializerClose,
  } = useDisclosure();
  const [mintsCreated, setMintsCreated] = useState<
    | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
    | undefined
  >();
  const [isAllowed, setIsAllowed] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "startDefault", allowed: false, maxAmount: 0 },
  ]);
  const [firstRun, setFirstRun] = useState(true);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);

  if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
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
  }
  const candyMachineId: PublicKey = useMemo(() => {
    if (process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      return publicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID);
    } else {
      console.error(`NO CANDY MACHINE IN .env FILE DEFINED!`);
      toast({
        id: "no-cm",
        title: "No candy machine in .env!",
        description: "Add your candy machine address to the .env file!",
        status: "error",
        duration: 999999,
        isClosable: true,
      });
      return publicKey("11111111111111111111111111111111");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { candyMachine, candyGuard } = useCandyMachine(
    umi,
    candyMachineId,
    checkEligibility,
    setCheckEligibility,
    firstRun,
    setFirstRun
  );

  useEffect(() => {
    const checkEligibilityFunc = async () => {
      if (!candyMachine || !candyGuard || !checkEligibility || isShowNftOpen) {
        return;
      }
      setFirstRun(false);

      const { guardReturn, ownedTokens } = await guardChecker(
        umi,
        candyGuard,
        candyMachine
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

    checkEligibilityFunc();
    // On purpose: not check for candyMachine, candyGuard, solanaTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umi, checkEligibility, firstRun]);

  const PageContent = () => {
    return (
      <>
        <Card backgroundColor="#5175e2" border="1px" borderColor="black.200">
          <CardHeader>
            <Flex
              minWidth="max-content"
              alignItems="center"
              justifyContent="center"
              gap="2"
            >
              <Box marginTop="5" marginBottom="5">
                <Heading size="lg" textAlign="center" color="#F8F8B4">
                  {headerText}
                </Heading>
              </Box>
            </Flex>
          </CardHeader>

          <CardBody>
            <Center>
              <Box rounded={"lg"} mt={-12} pos={"relative"}>
                <Image
                  layout="fit"
                  objectFit={"cover"}
                  alt={"project Image"}
                  src={RainbowCard}
                  style={{ borderRadius: "10px" }}
                />
                <Badge
                  pos={"absolute"}
                  top="5"
                  left="5"
                  backgroundColor="gray.500"
                  color="white"
                  paddingX="3"
                  paddingY="0.2"
                  borderRadius="lg"
                >
                  200K CBTM
                </Badge>
              </Box>
            </Center>
            <Center>
              {loading ? (
                <></>
              ) : (
                <Flex
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  className="font-roboto"
                  mt={4}
                >
                  <Text fontSize={"md"} className="tracking-wide">
                    Available NFTs :{" "}
                  </Text>
                  <Text fontWeight={"semibold"} className="tracking-wider">
                    {Number(candyMachine?.data.itemsAvailable) -
                      Number(candyMachine?.itemsRedeemed)}
                    /{Number(candyMachine?.data.itemsAvailable)}
                  </Text>
                </Flex>
              )}
            </Center>
            <Stack divider={<StackDivider />} spacing="6">
              {loading ? (
                <div>
                  <Divider my="10px" />
                  <Skeleton height="30px" my="10px" />
                  <Skeleton height="30px" my="10px" />
                  <Skeleton height="30px" my="10px" />
                </div>
              ) : (
                <ButtonList
                  guardList={guards}
                  candyMachine={candyMachine}
                  candyGuard={candyGuard}
                  umi={umi}
                  ownedTokens={ownedTokens}
                  setGuardList={setGuards}
                  mintsCreated={mintsCreated}
                  setMintsCreated={setMintsCreated}
                  onOpen={onShowNftOpen}
                  setCheckEligibility={setCheckEligibility}
                />
              )}
              <div className="flex flex-col justify-center text-white px-3">
                <span>
                  <b>Bronze Keycards (80% chance) :</b> 1k $CBTM per 24h
                </span>
                <span>
                  <b>Silver Keycards (10% chance) :</b> 1.5k $CBTM per 24h
                </span>
                <span>
                  <b>Gold Keycards (5% chance) :</b> 2k $CBTM per 24h
                </span>
                <span>
                  <b>Rainbow Keycards (5% chance) :</b> 2k $CBTM per 24h + 1
                  $SOL prize giveaway
                </span>
              </div>
            </Stack>
          </CardBody>
        </Card>
        {umi.identity.publicKey === candyMachine?.authority ? (
          <>
            <Center>
              <Button
                backgroundColor={"red.200"}
                marginTop={"10"}
                onClick={onInitializerOpen}
              >
                Initialize Everything!
              </Button>
            </Center>
            <Modal isOpen={isInitializerOpen} onClose={onInitializerClose}>
              <ModalOverlay />
              <ModalContent maxW="600px">
                <ModalHeader>Initializer</ModalHeader>
                <ModalCloseButton />
                <ModalBody>
                  <InitializeModal
                    umi={umi}
                    candyMachine={candyMachine}
                    candyGuard={candyGuard}
                  />
                </ModalBody>
              </ModalContent>
            </Modal>
          </>
        ) : (
          <></>
        )}

        <Modal isOpen={isShowNftOpen} onClose={onShowNftClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Your minted NFT:</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <ShowNft nfts={mintsCreated} />
            </ModalBody>
          </ModalContent>
        </Modal>
      </>
    );
  };

  return (
    <div className="w-full h-full flex flex-col relative z-[50]">
      <div className="w-full flex items-center justify-end pt-5 md:pt-8">
        <div className="bg-transparent hidden sm:flex items-center justify-center gap-5">
          <button
            className="mx-1 text-white font-extrabold text-xl"
            onClick={() => {
              window.open(
                "https://jup.ag/swap/SOL-CBTM_FpZWLF31ymwJQNKwdhxAog9HwFEJGWjk6JqQUWYnuHry",
                "_blank"
              );
            }}
          >
            BUY $CBTM
          </button>
          <span className="mx-1">
            <Image src={Round} alt="" width={22} />
          </span>
          <span className="mx-1">
            <Image src={Twitter} alt="" width={22} />
          </span>
          <span className="mx-1">
            <Image src={Telegram} alt="" width={22} />
          </span>
        </div>
        <div className="px-0 sm:px-2 xl:px-4 mx-3">
          <WalletMultiButtonDynamic />
        </div>
      </div>
      <div className={styles.center}>
        <PageContent key="content" />
      </div>
      <div className="absolute left-0 w-full h-full z-[-1]">
        <Image
          src={BG}
          alt={"Background"}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>
    </div>
  );
}
