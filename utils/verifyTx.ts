import { PublicKey, Some, Umi } from "@metaplex-foundation/umi";
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

export const verifyTx = async (umi: Umi, signatures: Uint8Array[]) => {
  const verifySignature = async (
    signature: Uint8Array
  ): Promise<VerifySignatureResult> => {
    console.log(base58.deserialize(signature))
    let transaction;
    for (let i = 0; i < 30; i++) {
      transaction = await umi.rpc.getTransaction(signature);
      if (transaction) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

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
  let failed: string[] = []
  stati.forEach((status) => {
    if ((status.success === true)) {
      successful.push(status.mint);
    } else {
      failed.push(status.reason)
    }
  });

  if (failed && failed.length > 0){
    createStandaloneToast().toast({
      title: `${failed.length} Mints failed!`,
      status: "error",
      duration: 3000,
    });
    failed.forEach((fail) => {
      console.error(fail)
    })
  }

  if (successful.length > 0){
    createStandaloneToast().toast({
      title: `${successful.length} Mints successful!`,
      status: "success",
      duration: 3000,
    });
  }

  return successful;
};
