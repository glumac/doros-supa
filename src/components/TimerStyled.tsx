import React from "react";
import styled from "styled-components";
import Digit from "./Digit";

const TimerContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin-bottom: 30px;
  position: relative;
`;

const SeparatorContainer = styled.span`
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: center;
  position: relative;
  top: 2vw;
`;

const Separator = styled.span`
  display: block;
  width: 1vw;
  height: 1vw;
  background-color: #4c5a23;
  border-radius: 6px;
  margin: 5px 0px;
`;

interface TimerStyledProps {
  seconds: number;
  minutes: number;
}

export default function TimerStyled({ seconds, minutes }: TimerStyledProps) {
  let color = "red";

  if (minutes >= 20) {
    color = "#4c5a23";
  } else if (minutes >= 15) {
    color = "#b4a12d";
  } else if (minutes >= 10) {
    color = "#e39533";
  } else if (minutes >= 5) {
    color = "#d62e2e";
  } else {
    color = "#600000";
  }

  return (
    <TimerContainer>
      <Digit color={color} value={minutes} title="MINUTES" />
      <SeparatorContainer>
        <Separator />
        <Separator />
      </SeparatorContainer>
      <Digit color={color} value={seconds} title="SECONDS" />
    </TimerContainer>
  );
}
