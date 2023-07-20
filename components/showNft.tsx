import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey, Umi } from "@metaplex-foundation/umi";
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
        <><Divider marginTop={"15px"} /><SimpleGrid marginTop={"15px"}>{traitList}</SimpleGrid></>);
};


//https://chakra-templates.dev/page-sections/carousels
const settings = {
    dots: false,
    arrows: false,
    fade: true,
    infinite: true,
    autoplay: false,
    speed: 500,
    autoplaySpeed: 5000,
    slidesToShow: 1,
    slidesToScroll: 1,
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
            <Traits metadata={metadata}></Traits>
        </Box>
    );
}

type Props = {
    umi: Umi;
    nfts: { mint: PublicKey, offChainMetadata: JsonMetadata | undefined }[] | undefined;
};

//create a async  function that takes in a umi and a nftAdress and returns a JSX element. It should fetch the digital asset from the nftAdress and then return a JSX element with the image and name of the nft
export const ShowNft = ({ umi, nfts }: Props) => {
    if (nfts === undefined) {
        return <></>
    }

    // get the last added nft
    const { mint, offChainMetadata } = nfts[nfts.length - 1];
    if (offChainMetadata === undefined) {
        return <></>
    }
    return (
        <Card metadata={offChainMetadata} key={mint}></Card>
    );
}
