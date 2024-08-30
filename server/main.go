package main

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for simplicity
	},
}

var (
	messages []string
	mu       sync.Mutex
)

var (
	subscribers []*websocket.Conn
	muSub       sync.Mutex
)

func addSubscriber(conn *websocket.Conn) {
	muSub.Lock()
	subscribers = append(subscribers, conn)
	muSub.Unlock()
}

func addMessage(msg string) {
	mu.Lock()
	messages = append(messages, msg)
	mu.Unlock()
}

func wsEndpoint(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Println("Error while upgrading connection:", err)
		return
	}
	defer conn.Close()

	addSubscriber(conn)

	for _, msg := range messages {
		err := conn.WriteMessage(websocket.TextMessage, []byte(msg))
		if err != nil {
			fmt.Println("Error sending message:", err)
			return
		}
	}

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("Error while reading message:", err)
			break
		}
		addMessage(string(msg))
		// fmt.Printf("All of them: ", strings.Join(messages, " "))
		fmt.Printf("Received: %s\n", msg)
		// conn.WriteMessage(messageType, msg)

		// err = conn.WriteMessage(messageType, msg)
		// if err != nil {
		// 	fmt.Println("Error while writing message:", err)
		// 	break
		// }

		for _, sub := range subscribers {
			err := sub.WriteMessage(websocket.TextMessage, []byte(msg))
			fmt.Println("sending to subscriber")

			if err != nil {
				fmt.Println("Error while sending to subscriber: ", err)
			}
		}
	}
}

func main() {
	http.HandleFunc("/ws", wsEndpoint)
	fmt.Println("Server started at :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Println("Error starting server:", err)
	}
}
