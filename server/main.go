package main

import (
	"fmt"
	"io"
	"net/http"
	"server/lib"
	"server/lib/media"
	"server/lib/room"
	"strconv"
	"time"
)

func parseDate(date_str string) int64 {
	num, err := strconv.ParseInt(date_str, 10, 64)
	if err != nil {
		return int64(time.Now().Second())
	}
	return num
}

func send_message(w http.ResponseWriter, req *http.Request) {
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Sending message")
	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}

	message := lib.Message{
		Date:     parseDate(req.FormValue("date")),
		Room:     req.FormValue("room"),
		Username: req.FormValue("username"),
		Msg:      req.FormValue("msg"),
	}

	user, err := lib.GetUser(message.Username)
	if err != nil {
		fmt.Println("Can't get user: ", err)
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	if user.Password != req.FormValue("password") {
		http.Error(w, "Wrong password", http.StatusUnauthorized)
		return
	}

	stringifiedMessage, err := lib.MessageToJson(message)
	if err != nil {
		fmt.Println("Can't stringify message: ", err)
		http.Error(w, "Can't process your message", http.StatusInternalServerError)
		return
	}

	err = lib.WriteStringifiedJsonToFileAppend(stringifiedMessage, message.Room)
	if err != nil {
		fmt.Println("Can't save message: ", err)
		http.Error(w, "Can't save your message", http.StatusInternalServerError)
		return
	}

	w.Write([]byte(http.StatusText(200)))
}

func query_messages(w http.ResponseWriter, req *http.Request) {
	timestamp := req.URL.Query().Get("timestamp")
	room := req.URL.Query().Get("room")

	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Querying messages for room: ", room)
	history, err := lib.ReadHistoryFromFile(room)
	if err != nil {
		fmt.Println("Can't read history: ", err)
		http.Error(w, "Can't read the room history", http.StatusInternalServerError)
		return
	}

	filteredHistory, err := lib.GetChatHistoryAfterTimestamp(history, parseDate(timestamp))
	if err != nil {
		fmt.Println("Can't filter history: ", err)
		http.Error(w, "Can't filter the room history", http.StatusInternalServerError)
		return
	}
	toJson := lib.HistoryToJson(filteredHistory)

	w.Write([]byte(toJson))
}

func auth(w http.ResponseWriter, req *http.Request) {

	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
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

	user, err := lib.GetUser(username)
	if err != nil {
		fmt.Println("Can't get user: ", err)
		http.Error(w, "Can't get user", http.StatusInternalServerError)
		return
	}

	if user.Username == "" {
		err = lib.CreateUser(username, password)
		if err != nil {
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
		err := room.CreateRoom(roomData)
		if err != nil {
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

		err := room.EditRoom(roomData)
		if err != nil {
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

		roomDataLoaded, err := room.GetRoom(roomData.Id)
		if err != nil {
			http.Error(w, "Cannot get room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		serializedRoom, err := room.SerializeRoom(roomDataLoaded)
		if err != nil {
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
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Uploading media")

	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	data, err := io.ReadAll(req.Body)
	if err != nil {
		http.Error(w, "Cannot read request body: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer req.Body.Close()

	fileID := req.URL.Query().Get("file_id")
	if fileID == "" {
		http.Error(w, "file_id parameter is required", http.StatusBadRequest)
		return
	}

	err = media.SaveMediaToFile(string(data), fileID)
	if err != nil {
		http.Error(w, "Cannot save the file", http.StatusBadRequest)
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Media uploaded successfully"))
}

func downloadMedia(w http.ResponseWriter, req *http.Request) {
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Downloading media")

	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get the file_id from the URL parameters
	fileID := req.URL.Query().Get("file_id")
	if fileID == "" {
		http.Error(w, "file_id parameter is required", http.StatusBadRequest)
		return
	}

	binaryData, err := media.GetMediaFromFile(fileID)
	if err != nil {
		http.Error(w, "Cannot read the file: "+err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(binaryData)))

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(binaryData))
}

func main() {
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

	http.ListenAndServe(":8090", nil)
}
