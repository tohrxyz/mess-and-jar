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
  const room = getFromStorage("room") ?? "general";
  const res = await fetch(`http://localhost:8090/query_messages?room=${room}&timestamp=${mostRecentTimestamp}`);

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


  const saveData = () => {
    const usernameInput = document.getElementById("set-username-input") as HTMLInputElement;
    const usernameVal = usernameInput?.value;
    const roomInput = document.getElementById("set-room-input") as HTMLInputElement;
    const roomVal = roomInput?.value;
    if (typeof usernameVal !== "undefined") {
      saveToStorage("username", usernameVal);
      saveToStorage("room", roomVal);
      setUsername(usernameVal);
      setMessages([]);
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

  const nukeSession = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("room");
    setUsername("");
    setMessages([]);
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
      <br />
      <input placeholder="Enter room name" id="set-room-input"/>
      <button onClick={() => saveData()}>Save data</button>
    </div>
  ) : (
    <div className="font-sans p-4 w-full text-center">
      <div className="flex flex-row gap-x-4 w-full justify-between">
        <div className="flex flex-row">
          <h1 className="font-bold text-xl text-white rounded-tl-xl px-3 py-2 bg-blue-500">{ username }</h1>
          <button className="px-3 py-2 bg-red-600 text-white rounded-tr-xl" onClick={() => nukeSession()}><strong>Nuke</strong></button>
        </div>
        <div className="flex flex-row">
          <input type="text" placeholder="Enter your new name" id="set-username-input" className="rounded-tl-xl px-2 py-1 bg-slate-800 text-white" />
          <button className="px-2 py-1 bg-blue-500 rounded-tr-xl text-white" onClick={() => changeUsername()}>Change User</button>
        </div>
      </div>
      <ChatMenuLayout>
        <div className="w-full flex flex-col gap-y-6 p-3 min-h-[500px] justify-between">
          <div className="flex flex-col gap-y-6 max-h-[500px] overflow-y-scroll" ref={scrollbarRef} >
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
    <div className="flex flex-col gap-x-2 items-start justify-start">
      <div className="flex flex-row gap-x-2 items-center justify-startpx-1 rounded">
        <strong className="text-white">{"@" + username }: </strong>
        <span className="text-gray-100 text-xs">{`(${formatTimestamp(date)})`}</span>
      </div>
      <span className="text-white bg-slate-900 px-2 py-1 w-full text-start">{ message }</span>
    </div>
  )
}

const SendMessage = ({ messages, setMessages }: { messages: Message[], setMessages: Dispatch<React.SetStateAction<Message[]>>}) => {
  const [message, setMessage] = useState("");
  const username = getFromStorage("username");
  const room = getFromStorage("room");

  const sendMessage = async () => {
    if (message.length === 0) {
      return;
    }
    const formData = new FormData;
    const dateNow = Date.now().toString();
    formData.append("date", dateNow);
    formData.append("room", room ?? "general");
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
        className="w-full px-2 py-1 rounded-l-xl bg-slate-600 text-white focus:outline-none"
        onKeyDown={(e) => handleEnter(e)}
        autoComplete="off"
      />
      <button className="px-3 p-1 rounded-r-xl bg-blue-400 text-white" onClick={() => sendMessage()}>Send</button>
    </div>
  )
}