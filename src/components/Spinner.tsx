import React from "react";
import { Circles } from "react-loader-spinner";

interface SpinnerProps {
  message?: string;
}

function Spinner({ message }: SpinnerProps) {
  return (
    <div className="flex flex-col justify-center items-center w-full h-full">
      <Circles
        height="80"
        width="80"
        color="#4fa94d"
        ariaLabel="circles-loading"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
      />

      <p className="text-lg text-green-700 text-center mt-12 px-2">{message}</p>
    </div>
  );
}

export default Spinner;
