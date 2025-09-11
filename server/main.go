package main

import (
	"net/http"
	"server/api"
	"server/db"
	"time"
)

const DB_PATH = "./db/mess-and-jar.db"

const API_PORT = ":8090"
const API_READ_TIMEOUT_SECONDS = 40 * time.Second
const API_WRITE_TIMEOUT_SECONDS = 40 * time.Second
const API_IDLE_TIMEOUT_SECONDS = 60 * time.Second

func main() {
	db.Init()
	defer db.Close()

	corsOptions := api.Get_cors_options()

	// message apis
	http.Handle("/send_message", corsOptions[0](http.HandlerFunc(api.Send_message)))
	http.Handle("/query_messages", corsOptions[0](http.HandlerFunc(api.Query_messages)))
	http.Handle("/edit_message", corsOptions[0](http.HandlerFunc(api.EditMessage)))

	http.Handle("/auth", corsOptions[0](http.HandlerFunc(api.Auth)))

	http.Handle("/room", corsOptions[0](http.HandlerFunc(api.RoomEndpoint)))

	// media apis
	http.Handle("/upload_media", corsOptions[0](http.HandlerFunc(api.UploadMedia)))
	http.Handle("/download_media", corsOptions[0](http.HandlerFunc(api.DownloadMedia)))

	server := &http.Server{
		Addr:         API_PORT,
		ReadTimeout:  API_READ_TIMEOUT_SECONDS,
		WriteTimeout: API_WRITE_TIMEOUT_SECONDS,
		IdleTimeout:  API_IDLE_TIMEOUT_SECONDS,
	}

	server.ListenAndServe()
}
