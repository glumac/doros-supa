import React from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 5px;
  &: first-child {
    margin-left: 0;

`;

const Title = styled.span`
  color: #4c5a23;
  font-size: 16px;
  margin-bottom: 5px;
  @media (max-width: 568px) {
    font-size: 12px;
  }
`;

const DigitContainer = styled.div`
  display: flex;
  flex-direction: row;
  padding: 0;
`;

const SingleDigit = styled.span<{ color: string }>`
  position: relative;
  display: flex;
  flex: 0 1 25%;
  background-color: ${(props) => props.color};
  transition: background-color 30s ease;
  border-radius: 10px;
  justify-content: center;
  padding: 10px 12px;
  color: white;
  @media (max-width: 568px) {
    font-size: 50px;
    min-width: 60px;
  }
  @media (min-width: 568px) {
    font-size: 100px;
    min-width: 100px;
  }
  &:first-child {
    margin-right: 2px;
  }
  &:after {
    position: absolute;
    left: 0px;
    right: 0px;
    top: 50%;
    bottom: 50%;
    content: "";
    width: "100%";
    height: 2px;
    background-color: grey;
    box-shadow: 0px 0px 5px 0px grey;
    opacity: 0.4;
  }
`;

interface DigitProps {
  value: number | string;
  title: string;
  color: string;
}

export default function Digit({ value, title, color }: DigitProps) {
  const safeValue = Number(value) || 0;
  const leftDigit = safeValue >= 10 ? safeValue.toString()[0] : "0";
  const rightDigit =
    safeValue >= 10 ? safeValue.toString()[1] : safeValue.toString();
  return (
    <Container className="cq-digit-container">
      <Title className="cq-digit-title">{title}</Title>
      <DigitContainer className="cq-digit-digits-container">
        <SingleDigit color={color} className="cq-digit-digit cq-digit-cq-digit-left">{leftDigit}</SingleDigit>
        <SingleDigit color={color} className="cq-digit-digit cq-digit-cq-digit-right">{rightDigit}</SingleDigit>
      </DigitContainer>
    </Container>
  );
}
