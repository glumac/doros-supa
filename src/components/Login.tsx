import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import jwtDecode from "jwt-decode";
import tomatoes from "../assets/tomatoes.jpg";

import { client } from "../client";
import { DecodedJWT } from "../types/models";
import { CredentialResponse } from "@react-oauth/google";

const Login = () => {
  const [showingWhatIs, setShowingWhatIs] = useState(false);
  const [showingWhatIs2, setShowingWhatIs2] = useState(false);
  const navigate = useNavigate();

  const responseGoogle = (response: CredentialResponse) => {
    if (!response.credential) return;
    const decoded = jwtDecode<DecodedJWT>(response.credential);
    localStorage.setItem("user", JSON.stringify(decoded));
    const { name, picture, sub, email } = decoded;

    const initialedName = (name: string) => {
      try {
        const nameArray = name.split(" ");
        let initials = "";
        for (let i = 0; i < nameArray.length; i++) {
          if (i === 0) {
            initials += `${nameArray[i]} `;
          } else {
            initials += `${nameArray[i]?.[0] || ''}`;
          }
        }
        return initials;
      } catch (error) {
        return name;
      }
    };

    const doc = {
      _id: sub,
      _type: "user",
      userName: initialedName(name),
      email: email,
      image: picture,
    };

    console.log("doc", doc);
    client.createIfNotExists(doc).then(() => {
      navigate("/", { replace: true });
    });
  };

  return (
    <div>
      <div className="flex justify-start items-center flex-col h-screen">
        <div className=" relative w-full h-full">
          <img src={tomatoes} className="w-full h-full object-cover" alt="" />

          <div className="absolute flex flex-col justify-center items-center top-0 right-0 left-0 bottom-0 background-animate">
            <div className="pb-10">
              <h1 className="font-serif text-white text-8xl text-center">
                Crush Quest
              </h1>
            </div>

            <div className="shadow-2xl scale-150">
              <GoogleLogin
                onError={() => {
                  console.log("Login Failed");
                }}
                onSuccess={responseGoogle}
              />
            </div>

            <div className="pt-10 text-white flex-col flex relative">
              <button
                type="button"
                onClick={() => setShowingWhatIs(!showingWhatIs)}
                className="text-white font-serif text-xl underline-offset-4 underline py-0.5 mb-2 rounded-lg outline-none hover:text-slate-100"
              >
                ???
              </button>
              <div
                className="max-w-xs text-center transition-all"
                style={{ opacity: showingWhatIs ? 1 : 0 }}
              >
                <p className="font-semibold">
                  Crush Quest is a place where FOM (Friends of Mike) support
                  each other as we make our 2023 dreams come true.
                </p>
                <br />
                <button
                  type="button"
                  onClick={() => setShowingWhatIs2(!showingWhatIs2)}
                  className="text-white font-serif text-xl underline-offset-4 underline py-0.5 mb-2  rounded-lg outline-none hover:text-slate-100"
                >
                  ???
                </button>
              </div>
              <div
                className="max-w-xs text-center transition-all"
                style={{ opacity: showingWhatIs && showingWhatIs2 ? 1 : 0 }}
              >
                <p className="font-semibold">
                  How do we do this? With the power of the tomato. The Pomodoro
                  Technique commits us to 25 minute blocks of radical focus. We give encouragement to our pom pals as we sieze the year.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
