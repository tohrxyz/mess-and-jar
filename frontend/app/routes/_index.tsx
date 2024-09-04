import type { MetaFunction } from "@remix-run/node";
import { Dispatch, useEffect, useRef, useState } from "react";
import { ChatMenuLayout } from "~/layout/homepage_layout";
import { getFromStorage, saveToStorage } from "~/lib/storage";

export const meta: MetaFunction = () => {
  return [
    { title: "Mess-and-jar" },
    { name: "description", content: "Write msgs" },
  ];
};


interface Message {
  date: string;
  room: string;
  username: string,
  msg: string
}
const queryMsgs = async (messages: Message[], setMessages: Dispatch<React.SetStateAction<Message[]>>) => {
  const mostRecentTimestamp = messages.at(messages.length - 1)?.date ?? 0
  const res = await fetch(`http://localhost:8090/query_messages?room=general&timestamp=${mostRecentTimestamp}`);

  if (!res.ok) {
    console.error("Bad query req");
  }

  const data = await res.json() as Message[];
  setMessages(prev => [...prev, ...data])
}

export default function Index() {
  const [username, setUsername] = useState(getFromStorage("username") ?? "");
  const [messages, setMessages] = useState<Message[]>([])
  const scrollbarRef = useRef<HTMLDivElement>(null)


  const saveUsername = () => {
    const usernameInput = document.getElementById("set-username-input") as HTMLInputElement;
    const value = usernameInput?.value;
    if (typeof value !== "undefined") {
      saveToStorage("username", value);
      setUsername(value);
    }
  }

  const changeUsername = () => {
    const usernameInput = document.getElementById("set-username-input") as HTMLInputElement;
    const value = usernameInput?.value;
    if (value && value.length > 0) {
      saveToStorage("username", value);
      setUsername(value);
      username.style.display = "hidden";
    } else {
      usernameInput.style.display = "flex";
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      queryMsgs(messages, setMessages);
    }, 5000)

    return () => clearInterval(interval);
  }, [messages])

  useEffect(() => {
    queryMsgs(messages, setMessages)
  }, [])

  useEffect(() => {
		const logContainer = scrollbarRef.current;

    if (logContainer) {
      logContainer.scrollTop = logContainer.scrollHeight;
    }
	}, [messages])

  return !username ? (
    <div>
      <input placeholder="Enter your username" id="set-username-input"/>
      <button onClick={() => saveUsername()}>Save username</button>
    </div>
  ) : (
    <div className="font-sans p-4 w-full text-center">
      <div className="flex flex-row gap-x-4 w-full justify-between">
        <h1 className="font-bold text-xl">{ username }</h1>
        <div className="flex flex-row gap-x-4">
          <input type="text" placeholder="Enter your new name" id="set-username-input" className="hidden rounded-t-xl px-2 py-1 bg-slate-600 text-white" />
          <button className="px-2 py-1 bg-blue-500 rounded-t-xl text-white" onClick={() => changeUsername()}>Change User</button>
        </div>
      </div>
      <ChatMenuLayout>
        <div className="w-full flex flex-col gap-y-2 p-3 min-h-[500px] justify-between">
          <div className="flex flex-col gap-y-2 max-h-[500px] overflow-y-scroll" ref={scrollbarRef} >
            { messages.map((msg, index) => (
              <Message date={msg.date} username={msg.username} message={msg.msg} key={index}/>
            ))}
          </div>
          <SendMessage messages={messages} setMessages={setMessages}/>
        </div>
      </ChatMenuLayout>
    </div>
  )
}


const Message = ({ date, username, message}: { date: string, username: string, message: string }) => {
  const formatTimestamp = (timestamp: string) => {
    // const day = new Date(parseInt(timestamp)).getDate();
    // const monthAsString = new Date(parseInt(timestamp)).toLocaleString('default', { month: 'long' });
    // const time = new Date(parseInt(timestamp)).toLocaleTimeString();
    // return `${day}/${monthAsString} ${time}`;

    return new Date(parseInt(timestamp)).toLocaleString();
  }
  
  return (
    <div className="flex gap-x-2 items-center justify-start">
      <span className="text-gray-100 text-xs">{formatTimestamp(date)}</span>
      <strong>{ username }: </strong>
      <span>{ message }</span>
    </div>
  )
}

const SendMessage = ({ messages, setMessages }: { messages: Message[], setMessages: Dispatch<React.SetStateAction<Message[]>>}) => {
  const [message, setMessage] = useState("");
  const username = getFromStorage("username");

  const sendMessage = async () => {
    const formData = new FormData;
    const dateNow = Date.now().toString();
    formData.append("date", dateNow);
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

    queryMsgs(messages, setMessages)
  }

  const handleEnter = (event: KeyboardEvent) => {
    if (event.key === "Enter" && message.length > 0) {
      sendMessage();
    }
  }

  return (
    <div className="flex flex-row gap-y-2 w-full">
      <input 
        value={message} 
        onChange={(val) => setMessage(val.target.value)} 
        className="w-full p-1"
        onKeyDown={(e) => handleEnter(e)}
      />
      <button className="px-3 p-2 bg-blue-400 text-white" onClick={() => sendMessage()}>Send</button>
    </div>
  )
}