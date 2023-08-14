
// const PageContentTemp = () => {
//   return (
//     <>
//       <style jsx global>
//         {`
//           body {
//             background: #2d3748;
//           }
//         `}
//       </style>
//       <Card>
//         <CardHeader>
//           <Flex minWidth="max-content" alignItems="center" gap="2">
//             <Box>
//               <Heading size="md">{headerText}</Heading>
//             </Box>
//             {loading ? (
//               <></>
//             ) : (
//               <Flex justifyContent="flex-end" marginLeft="auto">
//                 <Box
//                   background={"teal.100"}
//                   borderRadius={"5px"}
//                   minWidth={"50px"}
//                   minHeight={"50px"}
//                   p={2}
//                 >
//                   <VStack>
//                     <Text fontSize={"sm"}>Available NFTs:</Text>
//                     <Text fontWeight={"semibold"}>
//                       {Number(candyMachine?.itemsLoaded) -
//                         Number(candyMachine?.itemsRedeemed)}
//                       /{candyMachine?.itemsLoaded}
//                     </Text>
//                   </VStack>
//                 </Box>
//               </Flex>
//             )}
//           </Flex>
//         </CardHeader>

//         <CardBody>
//           <Center>
//             <Box rounded={"lg"} mt={-12} pos={"relative"}>
//               <Image
//                 rounded={"lg"}
//                 height={230}
//                 objectFit={"cover"}
//                 alt={"project Image"}
//                 src={image}
//               />
//             </Box>
//           </Center>
//           <Divider my="10px" />
//           <Stack divider={<StackDivider />} spacing="8">
//             {loading ? (
//               <div>
//                 <Skeleton height="30px" my="10px" />
//                 <Skeleton height="30px" my="10px" />
//                 <Skeleton height="30px" my="10px" />
//               </div>
//             ) : (
//               <ButtonList
//                 guardList={guards}
//                 candyMachine={candyMachine}
//                 candyGuard={candyGuard}
//                 umi={umi}
//                 ownedTokens={ownedTokens}
//                 toast={toast}
//                 setGuardList={setGuards}
//                 mintsCreated={mintsCreated}
//                 setMintsCreated={setMintsCreated}
//                 onOpen={onShowNftOpen}
//                 setCheckEligibility={setCheckEligibility}
//               />
//             )}
//           </Stack>
//         </CardBody>
//       </Card>

//       {umi.identity.publicKey === candyMachine?.authority ? (
//         <>
//           <Center>
//             <Button
//               backgroundColor={"red.200"}
//               marginTop={"10"}
//               onClick={onInitializerOpen}
//             >
//               Initialize Everything!
//             </Button>
//           </Center>
//           <Modal isOpen={isInitializerOpen} onClose={onInitializerClose}>
//             <ModalOverlay />
//             <ModalContent maxW="600px">
//               <ModalHeader>Initializer</ModalHeader>
//               <ModalCloseButton />
//               <ModalBody>
//                 <InitializeModal
//                   umi={umi}
//                   candyMachine={candyMachine}
//                   candyGuard={candyGuard}
//                   toast={toast}
//                 />
//               </ModalBody>
//             </ModalContent>
//           </Modal>
//         </>
//       ) : (
//         <></>
//       )}

//       <Modal isOpen={isShowNftOpen} onClose={onShowNftClose}>
//         <ModalOverlay />
//         <ModalContent>
//           <ModalHeader>Your minted NFT:</ModalHeader>
//           <ModalCloseButton />
//           <ModalBody>
//             <ShowNft nfts={mintsCreated} />
//           </ModalBody>
//         </ModalContent>
//       </Modal>
//     </>
//   );
// }