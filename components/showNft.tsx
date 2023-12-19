import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@metaplex-foundation/umi";
import { Box, Text, Divider, SimpleGrid, VStack } from "@chakra-ui/react";
import React from 'react';

interface TraitProps {
    heading: string;
    description: string;
}

interface TraitsProps {
    metadata: JsonMetadata;
}
const Trait = ({ heading, description }: TraitProps) => {
    return (
        <Box background={"teal.100"} borderRadius={"5px"} width={"120px"} minHeight={"50px"}>
            <VStack>
                <Text fontSize={"sm"}>{heading}</Text>
                <Text fontSize={"sm"} marginTop={"-2"} fontWeight={"semibold"}>{description}</Text>
            </VStack>
        </Box>

    );
};

const Traits = ({ metadata }: TraitsProps) => {
    if (metadata === undefined || metadata.attributes === undefined) {
        return <></>
    }


    //find all attributes with trait_type and value
    const traits = metadata.attributes.filter((a) => a.trait_type !== undefined && a.value !== undefined);
    //@ts-ignore
    const traitList = traits.map((t) => <Trait key={t.trait_type} heading={t.trait_type} description={t.value} />);

    return (
        <><Divider marginTop={"15px"} /><SimpleGrid marginTop={"15px"} columns={3} spacing={5}>{traitList}</SimpleGrid></>);
};



export default function Card({ metadata }: { metadata: JsonMetadata }) {

    // Get the images from the metadata if animation_url is present use this
    const image = metadata.animation_url ?? metadata.image;
    return (
        <Box
            position={'relative'}

            width={'full'}
            overflow={'hidden'}>

            <Box
                key={image}
                height={'sm'}
                position="relative"
                backgroundPosition="center"
                backgroundRepeat="no-repeat"
                backgroundSize="cover"
                backgroundImage={`url(${image})`}
            />
            <Text fontWeight={"semibold"} marginTop={"15px"}>{metadata.name}</Text>
            <Text>{metadata.description}</Text>
            <Traits metadata={metadata} />
        </Box>
    );
}

type Props = {
    nfts: { mint: PublicKey, offChainMetadata: JsonMetadata | undefined }[] | undefined;
};

export const ShowNft = ({ nfts }: Props) => {
    if (nfts === undefined) {
        return <></>
    }

    // get the last added nft
    const { mint, offChainMetadata } = nfts[nfts.length - 1];
    if (offChainMetadata === undefined) {
        return <></>
    }
    return (
        <Card metadata={offChainMetadata} key={mint} />
    );
}
