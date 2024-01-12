// create a react component that uses SolanaGatewayProvider

import { GatewayProvider } from "@civic/solana-gateway-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import React from "react";

const Gatekeeper = ({ 
  children,
  network,
}: { 
  children: React.ReactNode;
  network: WalletAdapterNetwork;
}) => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const gatekeeperNetwork = process.env.NEXT_GATEKEEPER_NETWORK || "ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6";

  return (
    <GatewayProvider
        wallet={wallet}
        cluster={network}
        connection={connection}
        gatekeeperNetwork={new PublicKey(gatekeeperNetwork)}
        options={{ autoShowModal: false }}
      >
        {children}
    </GatewayProvider>
  )
};

export default Gatekeeper;