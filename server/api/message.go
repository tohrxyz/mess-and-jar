package api

import (
	"context"
	"fmt"
	"net/http"
	"server/db"
	"server/lib"
	"time"
)

func Send_message(w http.ResponseWriter, req *http.Request) {
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Sending message")
	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	message := lib.Message{
		Date:      lib.ParseDate(req.FormValue("date")),
		Room:      req.FormValue("room"),
		Username:  req.FormValue("username"),
		Msg:       req.FormValue("msg"),
		Signature: req.FormValue("signature"),
	}

	user, err := db.GetUser(message.Username)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] send_message: Can't get user:", message.Username, "- error:", err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if user.Password != req.FormValue("password") {
		http.Error(w, "Wrong password", http.StatusUnauthorized)
		return
	}

	message.IdentityPubkey = user.IdentityPubkey // server assigns the newest identity key from db, based on username
	err = db.WriteMessage(message)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] send_message: Can't save message for user:", message.Username, "room:", message.Room, "- error:", err)
		http.Error(w, "Can't save your message", http.StatusInternalServerError)
		return
	}

	w.Write([]byte(http.StatusText(200)))
}

func EditMessage(w http.ResponseWriter, req *http.Request) {
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Editing message")

	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	timestampStr := req.FormValue("timestamp")
	roomID := req.FormValue("room")
	editedContent := req.FormValue("edited_content")

	if timestampStr == "" || roomID == "" {
		http.Error(w, "timestamp and room are required", http.StatusBadRequest)
		return
	}

	targetTimestamp := lib.ParseDate(timestampStr)
	err := db.UpdateMessage(roomID, targetTimestamp, editedContent)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] editMessage: Can't update message for room:", roomID, " and timestamp:", targetTimestamp, "- error:", err)
		http.Error(w, "Can't update message", http.StatusInternalServerError)
		return
	}

	w.Write([]byte(http.StatusText(http.StatusOK)))
}

func Query_messages(w http.ResponseWriter, req *http.Request) {
	timestamp := req.URL.Query().Get("timestamp")
	room := req.URL.Query().Get("room")

	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Querying messages for room: ", room)

	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	targetTimestamp := lib.ParseDate(timestamp)
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			messagesOrEmptyArray := []lib.Message{}
			stringifiedMessages, err := lib.ToJson(messagesOrEmptyArray)
			if err != nil {
				fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] query_messages: Can't serialize empty messages for room:", room, "- error:", err)
				http.Error(w, "Can't serialize messages", http.StatusInternalServerError)
				return
			}
			w.Write([]byte(stringifiedMessages))
			return

		case <-ticker.C:
			messages, err := db.GetMessagesAfterTimestamp(room, targetTimestamp)
			if err != nil {
				fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] query_messages: Can't read history for room:", room, "- error:", err)
				http.Error(w, "Can't read the room history", http.StatusInternalServerError)
				return
			}

			if len(messages) > 0 {
				stringifiedMessages, err := lib.ToJson(messages)
				if err != nil {
					fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] query_messages: Can't serialize messages for room:", room, "- error:", err)
					http.Error(w, "Can't serialize messages", http.StatusInternalServerError)
					return
				}
				w.Write([]byte(stringifiedMessages))
				return
			}
		}
	}
}
