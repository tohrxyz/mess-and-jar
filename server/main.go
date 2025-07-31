package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"server/db"
	"server/lib"
	"server/lib/media"
	"strconv"
	"time"
)

func parseDate(date_str string) int64 {
	num, err := strconv.ParseInt(date_str, 10, 64)
	if err != nil {
		return 0
	}
	return num
}

func send_message(w http.ResponseWriter, req *http.Request) {
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Sending message")
	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	message := lib.Message{
		Date:     parseDate(req.FormValue("date")),
		Room:     req.FormValue("room"),
		Username: req.FormValue("username"),
		Msg:      req.FormValue("msg"),
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

	err = db.WriteMessage(message)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] send_message: Can't save message for user:", message.Username, "room:", message.Room, "- error:", err)
		http.Error(w, "Can't save your message", http.StatusInternalServerError)
		return
	}

	w.Write([]byte(http.StatusText(200)))
}

func editMessage(w http.ResponseWriter, req *http.Request) {
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

	targetTimestamp := parseDate(timestampStr)
	err := db.UpdateMessage(roomID, targetTimestamp, editedContent)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] editMessage: Can't update message for room:", roomID, " and timestamp:", targetTimestamp, "- error:", err)
		http.Error(w, "Can't update message", http.StatusInternalServerError)
		return
	}

	w.Write([]byte(http.StatusText(http.StatusOK)))
}

func query_messages(w http.ResponseWriter, req *http.Request) {
	timestamp := req.URL.Query().Get("timestamp")
	room := req.URL.Query().Get("room")

	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Querying messages for room: ", room)

	ctx, cancel := context.WithTimeout(req.Context(), 30*time.Second)
	defer cancel()

	targetTimestamp := parseDate(timestamp)
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

func auth(w http.ResponseWriter, req *http.Request) {

	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username := req.FormValue("username")
	password := req.FormValue("password")

	if username == "" {
		http.Error(w, "Username is required", http.StatusBadRequest)
		return
	}

	if password == "" {
		http.Error(w, "Password is required", http.StatusBadRequest)
		return
	}

	user, err := db.GetUser(username)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] auth: Can't get user:", username, "- error:", err)
		http.Error(w, "Can't get user", http.StatusInternalServerError)
		return
	}

	if user.Username == "" {
		err = db.CreateUser(username, password)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] auth: Can't create user:", username, "- error:", err)
			http.Error(w, "Can't create user", http.StatusInternalServerError)
			return
		}

		w.Write([]byte(http.StatusText(http.StatusCreated)))
		return
	} else {
		if user.Password != password {
			http.Error(w, "Wrong password", http.StatusUnauthorized)
			return
		}
		w.Write([]byte(http.StatusText(http.StatusOK)))
		return
	}
}

const (
	RoomCreate = "create"
	RoomEdit   = "edit"
	RoomGet    = "get"
)

func roomEndpoint(w http.ResponseWriter, req *http.Request) {
	method := req.FormValue("method")
	if method == "" {
		http.Error(w, "Must specify room method (create/edit/get)", http.StatusBadRequest)
		return
	}

	roomData := lib.Room{
		Id:       req.FormValue("id"),
		Name:     req.FormValue("name"),
		Password: req.FormValue("password"),
	}

	switch method {
	case RoomCreate:
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Creating room: ", roomData.Id)
		if roomData.Id == "" || roomData.Name == "" || roomData.Password == "" {
			http.Error(w, "Must specify room id, name and password", http.StatusBadRequest)
			return
		}
		err := db.CreateRoom(roomData.Id, roomData.Name, roomData.Password)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot create room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot create room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Write([]byte(http.StatusText(http.StatusCreated)))
		return
	case RoomEdit:
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Editing room: ", roomData.Id)
		if roomData.Id == "" || roomData.Name == "" || roomData.Password == "" {
			http.Error(w, "Must specify room id, name and password", http.StatusBadRequest)
			return
		}

		requestedRoom, err := db.GetRoom(roomData.Id)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot get room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot get room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if requestedRoom.Password != roomData.Password {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Unauthorized to edit room:", roomData.Id)
			http.Error(w, "Unauthorized: incorrect room password", http.StatusUnauthorized)
			return
		}

		err = db.UpdateRoom(roomData.Name, roomData.Id)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot edit room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot edit room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Write([]byte(http.StatusText(http.StatusOK)))
		return
	case RoomGet:
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Querying room: ", roomData.Id)
		if roomData.Id == "" {
			http.Error(w, "Must specify room id", http.StatusBadRequest)
			return
		}

		roomDataLoaded, err := db.GetRoom(roomData.Id)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot get room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot get room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		serializedRoom, err := lib.ToJson(roomDataLoaded)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot serialize room data for room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot serialize room data: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Write([]byte(serializedRoom))
		return
	default:
		http.Error(w, "Unsupported room method", http.StatusBadRequest)
	}
}

func uploadMedia(w http.ResponseWriter, req *http.Request) {
	fileID := req.URL.Query().Get("file_id")
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Uploading media with ID:", fileID)

	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	data, err := io.ReadAll(req.Body)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] uploadMedia: Cannot read request body for file ID:", fileID, "- error:", err)
		http.Error(w, "Cannot read request body: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer req.Body.Close()

	if fileID == "" {
		http.Error(w, "file_id parameter is required", http.StatusBadRequest)
		return
	}

	err = media.SaveMediaToFile(data, fileID)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] uploadMedia: Cannot save the file for ID:", fileID, "- error:", err)
		http.Error(w, "Cannot save the file", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Media uploaded successfully"))
}

func downloadMedia(w http.ResponseWriter, req *http.Request) {
	fileID := req.URL.Query().Get("file_id")
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Downloading media with ID:", fileID)

	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if fileID == "" {
		http.Error(w, "file_id parameter is required", http.StatusBadRequest)
		return
	}

	binaryData, err := media.GetMediaFromFile(fileID)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] downloadMedia: Cannot read the file for ID:", fileID, "- error:", err)
		http.Error(w, "Cannot read the file: "+err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(binaryData)))

	w.WriteHeader(http.StatusOK)
	w.Write(binaryData)
}

const DB_PATH = "./db/mess-and-jar.db"

func main() {
	db.Init()
	defer db.Close()
	corsOptions := []func(h http.Handler) http.Handler{
		func(h http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				// Set the CORS headers
				w.Header().Set("Access-Control-Allow-Origin", "*")
				w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
				w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
				if r.Method == "OPTIONS" {
					w.WriteHeader(http.StatusOK)
					return
				}

				h.ServeHTTP(w, r)
			})
		},
	}
	http.Handle("/send_message", corsOptions[0](http.HandlerFunc(send_message)))
	http.Handle("/query_messages", corsOptions[0](http.HandlerFunc(query_messages)))
	http.Handle("/auth", corsOptions[0](http.HandlerFunc(auth)))
	http.Handle("/room", corsOptions[0](http.HandlerFunc(roomEndpoint)))
	http.Handle("/upload_media", corsOptions[0](http.HandlerFunc(uploadMedia)))
	http.Handle("/download_media", corsOptions[0](http.HandlerFunc(downloadMedia)))
	http.Handle("/edit_message", corsOptions[0](http.HandlerFunc(editMessage)))

	server := &http.Server{
		Addr:         ":8090",
		ReadTimeout:  40 * time.Second,
		WriteTimeout: 40 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	server.ListenAndServe()
}
