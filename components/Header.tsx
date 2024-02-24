import React from "react";
import Image from "next/legacy/image";
import Round from "@/public/assets/Round.svg";
import Twitter from "@/public/assets/Twitter.svg";
import Telegram from "@/public/assets/Telegram.svg";
import ConnectWallet from "@/components/ConnectWallet";
import dynamic from "next/dynamic";
import styles from "@/styles/Home.module.css";

function Header() {
  const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

  return (
    <div className="w-full flex items-center justify-end pt-5 md:pt-8 bg-[#97aded]">
      <div className="bg-transparent hidden sm:flex items-center justify-center gap-5">
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
      <div className={`px-0 sm:px-2 xl:px-4 mx-3`}>
        <WalletMultiButtonDynamic />
      </div>
    </div>
  );
}

export default Header;
