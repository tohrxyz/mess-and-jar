package main

import (
	"fmt"
	"net/http"
	"server/api"
	"server/db"
	"server/lib"
	"time"
)

func auth(w http.ResponseWriter, req *http.Request) {

	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username := req.FormValue("username")
	password := req.FormValue("password")
	identityPubkey := req.FormValue("identity_pubkey")

	if username == "" {
		http.Error(w, "Username is required", http.StatusBadRequest)
		return
	}

	if password == "" {
		http.Error(w, "Password is required", http.StatusBadRequest)
		return
	}

	if identityPubkey == "" {
		http.Error(w, "Identity Pubkey is required", http.StatusBadRequest)
		return
	}

	user, err := db.GetUser(username)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] auth: Can't get user:", username, "- error:", err)
		http.Error(w, "Can't get user", http.StatusInternalServerError)
		return
	}

	if user.Username == "" {
		err = db.CreateUser(username, password, identityPubkey)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] auth: Can't create user:", username, "- error:", err)
			http.Error(w, "Can't create user", http.StatusInternalServerError)
			return
		}

		w.Write([]byte(http.StatusText(http.StatusCreated)))
		return
	} else if user.IdentityPubkey != identityPubkey && (user.Username != "" && password == user.Password) {
		err := db.EditUser(username, password, identityPubkey)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] auth: Can't update identity key for user:", username, "-error:", err)
			http.Error(w, "Can't update identity key", http.StatusInternalServerError)
			return
		}
		fmt.Println("[LOG]: auth: Updated identity key for user:", username, "to: ", identityPubkey)
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

	// message apis
	http.Handle("/send_message", corsOptions[0](http.HandlerFunc(api.Send_message)))
	http.Handle("/query_messages", corsOptions[0](http.HandlerFunc(api.Query_messages)))
	http.Handle("/edit_message", corsOptions[0](http.HandlerFunc(api.EditMessage)))

	http.Handle("/auth", corsOptions[0](http.HandlerFunc(auth)))

	http.Handle("/room", corsOptions[0](http.HandlerFunc(roomEndpoint)))

	// media apis
	http.Handle("/upload_media", corsOptions[0](http.HandlerFunc(api.UploadMedia)))
	http.Handle("/download_media", corsOptions[0](http.HandlerFunc(api.DownloadMedia)))

	server := &http.Server{
		Addr:         ":8090",
		ReadTimeout:  40 * time.Second,
		WriteTimeout: 40 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	server.ListenAndServe()
}
