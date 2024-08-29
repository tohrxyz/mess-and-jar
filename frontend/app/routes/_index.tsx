import type { MetaFunction } from "@remix-run/node";
import { useState } from "react";
import { ChatMenuLayout } from "~/layout/homepage_layout";
import { getFromStorage, saveToStorage } from "~/lib/storage";

export const meta: MetaFunction = () => {
  return [
    { title: "Mess-and-jar" },
    { name: "description", content: "Write msgs" },
  ];
};

const dummyMessages = [
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
  ["alice", "hey"],
  ["bob", "hi"],
]

export default function Index() {
  const [username, setUsername] = useState(getFromStorage("username") ?? "");

  const saveUsername = () => {
    const usernameInput = document.getElementById("set-username-input") as HTMLInputElement;
    const value = usernameInput?.value;
    if (typeof value !== "undefined") {
      saveToStorage("username", value);
      setUsername(value);
    }
  }

  return !username ? (
    <div>
      <input placeholder="Enter your username" id="set-username-input"/>
      <button onClick={() => saveUsername()}>Save username</button>
    </div>
  ) : (
    <div className="font-sans p-4 w-full text-center">
      <h1>Welcome { username }!</h1>
      <ChatMenuLayout>
        <div className="w-full flex flex-col gap-y-2 p-3 min-h-[500px] justify-between">
          <div className="flex flex-col gap-y-2 max-h-[500px] overflow-y-scroll">
            { dummyMessages.map((msg, index) => (
              <Message username={msg[0]} message={msg[1]} key={index}/>
            ))}
          </div>
          <SendMessage />
        </div>
      </ChatMenuLayout>
    </div>
  )
}


const Message = ({ username, message}: { username: string, message: string }) => {
  return (
    <div className="flex gap-x-2">
      <strong>{ username }: </strong>
      <span>{ message }</span>
    </div>
  )
}

const SendMessage = () => {
  const [message, setMessage] = useState("");
  return (
    <div className="flex flex-row gap-y-2 w-full">
      <input value={message} onChange={(val) => setMessage(val.target.value)} className="w-full p-1"/>
      <button className="px-3 p-2 bg-blue-400 text-white">Send</button>
    </div>
  )
}