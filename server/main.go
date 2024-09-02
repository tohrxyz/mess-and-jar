package main

import (
	"fmt"
	"net/http"
	"strconv"
	"time"
)

type Message struct {
	date     int64
	room     string
	username string
	msg      string
}

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

	message := Message{
		date:     parseDate(req.FormValue("date")),
		room:     req.FormValue("room"),
		username: req.FormValue("username"),
		msg:      req.FormValue("msg"),
	}

	fmt.Printf("%+v \n", message)

	w.Write([]byte(http.StatusText(200)))
}

func query_messages(w http.ResponseWriter, req *http.Request) {

	for name, headers := range req.Header {
		for _, h := range headers {
			fmt.Fprintf(w, "%v: %v\n", name, h)
		}
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

	http.ListenAndServe(":8090", nil)
}
