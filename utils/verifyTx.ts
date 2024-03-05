import {
  PublicKey,
  Umi,
  BlockhashWithExpiryBlockHeight,
} from "@metaplex-foundation/umi";
import { createStandaloneToast } from "@chakra-ui/react";
import { base58 } from "@metaplex-foundation/umi/serializers";

const detectBotTax = (logs: string[]) => {
  if (logs.find((l) => l.includes("Candy Guard Botting"))) {
    return true;
  }
  return false;
};

type VerifySignatureResult =
  | { success: true; mint: PublicKey; reason?: never }
  | { success: false; mint?: never; reason: string };

export const verifyTx = async (
  umi: Umi,
  signatures: Uint8Array[],
  blockhash: BlockhashWithExpiryBlockHeight
) => {
  const verifySignature = async (
    signature: Uint8Array
  ): Promise<VerifySignatureResult> => {
    const confirmationRes = await umi.rpc.confirmTransaction(signature, {
      strategy: { type: "blockhash", ...blockhash },
    });

    if (confirmationRes.value.err)
      return { success: false, reason: confirmationRes.value.err.toString() };

    const transaction = await umi.rpc.getTransaction(signature);

    if (!transaction) {
      return { success: false, reason: "No TX found" };
    }

    if (detectBotTax(transaction.meta.logs)) {
      return { success: false, reason: "Bot Tax detected!" };
    }

    return { success: true, mint: transaction.message.accounts[1] };
  };

  const stati = await Promise.all(signatures.map(verifySignature));
  let successful: PublicKey[] = [];
  let failed: string[] = [];

  stati.forEach((status) => {
    if (status.success === true) {
      successful.push(status.mint);
    } else {
      failed.push(status.reason);
    }
  });

  if (failed && failed.length > 0) {
    createStandaloneToast().toast({
      title: `${failed.length} Mints failed!`,
      status: "error",
      duration: 3000,
    });
    failed.forEach((fail) => {
      console.error(fail);
    });
  }

  if (successful.length > 0) {
    createStandaloneToast().toast({
      title: `${successful.length} Mints successful!`,
      status: "success",
      duration: 3000,
    });
  }

  return successful;
};
