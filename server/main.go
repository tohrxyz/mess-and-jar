package main

import (
	"fmt"
	"net/http"
	"server/api"
	"server/db"
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

	http.Handle("/room", corsOptions[0](http.HandlerFunc(api.RoomEndpoint)))

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
