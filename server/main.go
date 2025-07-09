package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"server/lib"
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
	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}

	message := lib.Message{
		Date:     parseDate(req.FormValue("date")),
		Room:     req.FormValue("room"),
		Username: req.FormValue("username"),
		Msg:      req.FormValue("msg"),
	}

	stringifiedMessage, err := lib.MessageToJson(message)
	if err != nil {
		// error handling
		fmt.Println("Can't stringify message: ", err)
	}

	err = lib.WriteStringifiedJsonToFileAppend(stringifiedMessage, message.Room)
	if err != nil {
		// error handling
		fmt.Println("Can't save message: ", err)
	}

	w.Write([]byte(http.StatusText(200)))
}

func query_messages(w http.ResponseWriter, req *http.Request) {
	timestamp := req.URL.Query().Get("timestamp")
	room := req.URL.Query().Get("room")

	history, err := lib.ReadHistoryFromFile(room)
	if err != nil {
		// error handling
		fmt.Println("Can't read history: ", err)
	}

	filteredHistory, err := lib.GetChatHistoryAfterTimestamp(history, parseDate(timestamp))
	if err != nil {
		// error handling
		fmt.Println("Can't filter history: ", err)
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

	user, err := lib.ReadUserFromFile(username)
	if err != nil {
		fmt.Println("Can't read user: ", err)
	}

	userObj := lib.User{}

	err = json.Unmarshal([]byte(user), &userObj)
	if err != nil {
		fmt.Println("Can't unmarshal user: ", err)
	}

	if userObj.Username == "" {
		// create
		fmt.Println("Creating user: ", username)
		if password == "" {
			fmt.Println("Can't create user: Password is required for new user registration")
			http.Error(w, "Can't create user: Password is required for new user registration", http.StatusBadRequest)
			return
		}
		err = lib.CreateUser(username, password)
		if err != nil {
			fmt.Println("Can't create user: ", err)
			http.Error(w, "Can't create user", http.StatusInternalServerError)
			return
		}

		w.Write([]byte(http.StatusText(http.StatusCreated)))
		return
	} else {
		// check password
		fmt.Println("User exists: ", userObj.Username)
		if userObj.Password != password {
			fmt.Println("Wrong password: ", username)
			http.Error(w, "Wrong password", http.StatusUnauthorized)
			return
		}
		fmt.Println("Correct password: ", username)
		w.Write([]byte(http.StatusText(http.StatusOK)))
		return
	}
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

	http.ListenAndServe(":8090", nil)
}
