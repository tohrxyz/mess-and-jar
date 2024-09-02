import type { MetaFunction } from "@remix-run/node";
import { useEffect, useState } from "react";
import { ChatMenuLayout } from "~/layout/homepage_layout";
import { getFromStorage, saveToStorage } from "~/lib/storage";

export const meta: MetaFunction = () => {
  return [
    { title: "Mess-and-jar" },
    { name: "description", content: "Write msgs" },
  ];
};

interface Message {
  user: string,
  message: string
}

export default function Index() {
  const [username, setUsername] = useState(getFromStorage("username") ?? "");
  const [messages, setMessages] = useState<Message[]>([])


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
            { messages.map((msg, index) => (
              <Message username={msg.user} message={msg.message} key={index}/>
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
  const username = getFromStorage("username");

  const sendMessage = async () => {
    const formData = new FormData;
    formData.append("date", Date.now().toString());
    formData.append("room", "general");
    formData.append("username", username);
    formData.append("msg", message);

    const res = await fetch("http://localhost:8090/send_message", {
      method: "POST",
      body: formData
    })
    if (!res.ok) {
      console.error("bad req")
    }
    setMessage("");
  }
  return (
    <div className="flex flex-row gap-y-2 w-full">
      <input value={message} onChange={(val) => setMessage(val.target.value)} className="w-full p-1"/>
      <button className="px-3 p-2 bg-blue-400 text-white" onClick={() => sendMessage()}>Send</button>
    </div>
  )
}