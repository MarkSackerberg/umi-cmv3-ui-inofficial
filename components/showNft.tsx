import { JsonMetadata, fetchDigitalAsset, fetchJsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey, Umi } from "@metaplex-foundation/umi";
import { Box, Text, IconButton, useBreakpointValue, Stack, Button, Flex, Heading, useColorModeValue, Badge, StatGroup, StatLabel, Stat, StatNumber, Divider, SimpleGrid, VStack, Center } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import React from 'react';
import Slider from 'react-slick';

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
        <><Divider marginTop={"15px"}/><SimpleGrid marginTop={"15px"}>{traitList}</SimpleGrid></>);
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

export default function Carousel({ metadata }: { metadata: JsonMetadata[] }) {
    console.log(metadata)
    // As we have used custom buttons, we need a reference variable to
    // change the state
    const [slider, setSlider] = React.useState<Slider | null>(null);

    // These are the breakpoints which changes the position of the
    // buttons as the screen size changes
    const top = useBreakpointValue({ base: '90%', md: '50%' });
    const side = useBreakpointValue({ base: '30%', md: '10px' });

    // find duplicates in the metadata array and remove them
    const uniqueMetadata = metadata.filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i)

    // remove the metadata that doesn't have an image or where the image is ""
    const filteredMetadata = uniqueMetadata.filter((m) => m.image !== "" && m.image !== undefined)

    // push all the image urls from metadata in an array. If it exists use animation_url instead
    const cards = filteredMetadata.map((m) => m.animation_url || m.image);
    console.log(cards)

    return (
        <Box
            position={'relative'}

            width={'full'}
            overflow={'hidden'}>
            {/* CSS files for react-slick 
            <link
                rel="stylesheet"
                type="text/css"
                charSet="UTF-8"
                href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick.min.css"
            />
            <link
                rel="stylesheet"
                type="text/css"
                href="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.6.0/slick-theme.min.css"
            /> */}
            {/* Left Icon */}
            {cards.length > 1 ? (
                <>
                    <IconButton
                        aria-label="left-arrow"
                        colorScheme="messenger"
                        borderRadius="full"
                        position="absolute"
                        left={side}
                        top={top}
                        transform={'translate(0%, -50%)'}
                        zIndex={2}
                        onClick={() => slider?.slickPrev()}>
                        A
                    </IconButton>
                    <IconButton
                        aria-label="right-arrow"
                        colorScheme="messenger"
                        borderRadius="full"
                        position="absolute"
                        right={side}
                        top={top}
                        transform={'translate(0%, -50%)'}
                        zIndex={2}
                        onClick={() => slider?.slickNext()}>
                        B
                    </IconButton>
                </>
            ) : (<></>)}

            <Slider {...settings} ref={(slider) => setSlider(slider)}>
                {cards.map((url, index) => (
                    <>
                        <Box
                            key={index}
                            height={'sm'}
                            position="relative"
                            backgroundPosition="center"
                            backgroundRepeat="no-repeat"
                            backgroundSize="cover"
                            backgroundImage={`url(${url})`}
                        />
                        <Text fontWeight={"semibold"} marginTop={"15px"}>{filteredMetadata[index].name}</Text>
                        <Text>{filteredMetadata[index].description}</Text>
                        <Traits metadata={filteredMetadata[index]}></Traits>
                    </>
                ))}
            </Slider>
        </Box>
    );
}

type Props = {
    umi: Umi;
    nfts: PublicKey[];
};

//create a async  function that takes in a umi and a nftAdress and returns a JSX element. It should fetch the digital asset from the nftAdress and then return a JSX element with the image and name of the nft
export const ShowNft = ({ umi, nfts }: Props) => {
    //state variable of type JsonMetadata with dummy data for uri
    const [offChainMetadata, setOffChainMetadata] = useState<JsonMetadata[]>([{
        name: "Loading...",
        image: ""
    }]);
    const [metadataVersion, setMetadataVersion] = useState(0);

    useEffect(() => {
        (async () => {
            const nftAdress = nfts[nfts.length - 1];
            const digitalAsset = await fetchDigitalAsset(umi, nftAdress);
            const jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.metadata.uri)
            //push the jsonMetadata to the state variable and make sure the dummy data is removed while keeping any other data that might be there and make sure no duplicates are added
            if (offChainMetadata.findIndex((el) => el.name === jsonMetadata.name) === -1) {
                setOffChainMetadata((prev) => {
                    const newOffChainMetadata = [...prev];
                    const index = newOffChainMetadata.findIndex((el) => el.name === "Loading...");
                    if (index !== -1) {
                        newOffChainMetadata[index] = jsonMetadata;
                    } else {
                        newOffChainMetadata.push(jsonMetadata);
                    }
                    return newOffChainMetadata;
                });
                console.log(jsonMetadata)
                setMetadataVersion((prev) => prev + 1);
            }

        })();
    }, [umi, nfts]);

    return (
        <Carousel metadata={offChainMetadata} key={metadataVersion}></Carousel>
    );
}
