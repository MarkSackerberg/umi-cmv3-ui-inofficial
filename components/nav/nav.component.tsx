import dynamic from "next/dynamic";
import { Flex, Text } from "@chakra-ui/react";
import Link from "next/link";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export const NavBar = () => {
  return (
    <Flex backgroundColor={'black'} justifyContent="space-between" alignItems="center" py="1" px="1rem">
      <Link href="/">
        <Text fontWeight="400" letterSpacing="1px" fontSize="2.5rem" color="white">
          Kyogen Clash
        </Text>
      </Link>
      <WalletMultiButtonDynamic />
    </Flex>
  );
};