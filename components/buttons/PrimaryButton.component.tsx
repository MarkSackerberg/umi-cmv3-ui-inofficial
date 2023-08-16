import styled from '@emotion/styled';
import { Button, ButtonProps } from '@chakra-ui/react';
import { colors } from '@/styles/styles';
// import { LoadingSpinner } from '../LoadingSpinner';

interface PrimaryButtonProps extends ButtonProps {
  loading?: boolean;
  children: React.ReactNode;
}

const StyledButton = styled(Button)`
  background-color: ${colors.main.kyogenPrimary};
  height: 57px;
  border: 3px solid black;
  border-radius: 50px;
  box-shadow: 4px 4px 0 #14161B, inset 0 -10px 0 rgba(0, 0, 0, 0.25);
  font-family: 'millimetre';
  font-weight: bold;
  text-transform: uppercase;
  padding: 5px 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  color: white;

  &:disabled,
  &.loading {
    background-color: ${colors.main.kyogenPrimaryDisabled};
    color: ${colors.main.kyogenTextDisabled};
  }

  &:hover {
    background-color: ${colors.main.kyogenPrimaryLight};
    color: black;
  }

  &:active {
    box-shadow: none;
    color: white;
  }
`;

export const PrimaryButton = ({ children, className, disabled, loading, ...props }: PrimaryButtonProps) => {
  return (
    <StyledButton
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {/* {loading && <LoadingSpinner />} */}
      {children}
    </StyledButton>
  );
};
