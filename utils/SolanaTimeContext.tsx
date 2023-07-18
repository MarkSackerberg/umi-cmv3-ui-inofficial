import React, { createContext, useContext, useEffect, useState } from "react";
import { getSolanaTime } from "./checkerHelper";
import { useUmi } from "./useUmi";

type SolanaTimeContextType = {
  solanaTime: bigint;
};

const SolanaTimeContext = createContext<SolanaTimeContextType>({
  solanaTime: BigInt(0),
});

export const useSolanaTime = () => useContext(SolanaTimeContext).solanaTime;

export const SolanaTimeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const umi = useUmi();
  const [solanaTime, setSolanaTime] = useState(BigInt(0));

  useEffect(() => {
    const fetchSolanaTime = async () => {
      const tempSolanaTime = await getSolanaTime(umi);
      setSolanaTime(tempSolanaTime);
    };
    fetchSolanaTime();
  }, [umi]);

  return (
    <SolanaTimeContext.Provider value={{ solanaTime }}>
      {children}
    </SolanaTimeContext.Provider>
  );
};