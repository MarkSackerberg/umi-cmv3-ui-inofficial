import { Flex } from "@chakra-ui/react";
import styled from "@emotion/styled";

// export const MainContainer = ({
//   children,
//   className,

// }: {
//   className?: string;
//   children: React.ReactNode;
// }) => {
//   return (
//     <Flex
//       flexDirection="column"
//       bg="#FBF2D8"
//       borderWidth="4px"
//       borderColor="#15171C"
//       boxShadow="0 4px 0 0 #15171C, 0 4px 4px 0 rgba(0, 0, 0, 0.1)"
//       py="10"
//       px="60px"
//       rounded="20px"
//       className={className}
//     >
//       {children}
//     </Flex>
//   );
// };

export const MainContainer = styled(Flex)`
  flex-direction: column;
  background-color: #FBF2D8;
  border-width: 4px;
  border-color: #15171C;
  box-shadow: 0 4px 0 0 #15171C, 0 4px 4px 0 rgba(0, 0, 0, 0.1);
  padding: 1rem;
  border-radius: 20px;
`;