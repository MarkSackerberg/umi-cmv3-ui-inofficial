// create a react component that uses SolanaGatewayProvider

import { GatewayProvider } from "@civic/solana-gateway-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";

const Gatekeeper = ({ 
  children,
  network,
  endpoint
}: { 
  children: React.ReactNode;
  network: WalletAdapterNetwork;
  endpoint: string;
}) => {
  const wallet = useWallet();
  const gatekeeperNetwork = process.env.NEXT_GATEKEEPER_NETWORK || "ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6";
  return (
    <GatewayProvider
      wallet={wallet}
      cluster={network}
      connection={new Connection(endpoint)}
      gatekeeperNetwork={new PublicKey(gatekeeperNetwork)}
      broadcastTransaction={true}
      gatekeeperSendsTransaction={false}
    >
      {children}
    </GatewayProvider>
  )
};

export default Gatekeeper;