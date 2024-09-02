package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

type Message struct {
	Date     int64  `json:"date"`
	Room     string `json:"room"`
	Username string `json:"username"`
	Msg      string `json:"msg"`
}

func parseDate(date_str string) int64 {
	num, err := strconv.ParseInt(date_str, 10, 64)
	if err != nil {
		return int64(time.Now().Second())
	}

	return num
}

func stringifyAsJson(val Message) string {
	// Convert the Person struct to a JSON string
	jsonData, err := json.Marshal(val)
	if err != nil {
		fmt.Println("Error:", err)
		return ""
	}

	return string(jsonData)
}

func parseJsonMessagesFromString(jsonStr string) ([]Message, error) {
	var messages []Message

	scanner := bufio.NewScanner(strings.NewReader(jsonStr))
	for scanner.Scan() {
		line := scanner.Text()
		if line != "" {
			var message Message
			err := json.Unmarshal([]byte(line), &message)
			if err != nil {
				return nil, err
			}
			messages = append(messages, message)
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return messages, nil
}

func writeToFile(message Message) {
	filepath := "./db/" + message.Room + ".json"
	stringifiedMessage := stringifyAsJson(message)

	_, err := os.Stat(filepath)
	if os.IsNotExist(err) {
		file, err := os.Create(filepath)
		if err != nil {
			fmt.Println("Error creating file:", err)
			return
		}
		file.WriteString(stringifiedMessage)
		file.Close()
		return
	}

	file, err := os.OpenFile("./db/"+message.Room+".json", os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Println("Error opening file:", err)
		return
	}
	defer file.Close()

	_, err = file.WriteString(stringifiedMessage + "\n")
	if err != nil {
		fmt.Println("Error writing to file:", err)
		return
	}
}

func getHistoryFromFile(room string, after_date string) (interface{}, error) {
	filepath := "./db/" + room + ".json"

	_, err := os.Stat(filepath)
	if os.IsNotExist(err) {
		fmt.Println("Room ", room, " doesn't exist.")
		return "room_doesnt_exist", err
	}

	file, err := os.OpenFile(filepath, os.O_RDONLY, 0)
	if err != nil {
		fmt.Println("Error with opening file: ", err)
		return "error_opening_file", err
	}

	defer file.Close()

	// Get the file size
	fileInfo, err := file.Stat()
	if err != nil {
		fmt.Println("Error:", err)
		return "error_getting_file_size", err
	}
	fileSize := fileInfo.Size()

	// Read the entire file contents
	contents := make([]byte, fileSize)
	_, err = file.Read(contents)
	if err != nil {
		fmt.Println("Error:", err)
		return "error_read_file_contents", err
	}

	parsed_data, err := parseJsonMessagesFromString(string(contents))
	if err != nil {
		fmt.Println("Error:", err)
		return "error_parse_json", err
	}
	return parsed_data, nil
}

func send_message(w http.ResponseWriter, req *http.Request) {
	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}

	message := Message{
		Date:     parseDate(req.FormValue("date")),
		Room:     req.FormValue("room"),
		Username: req.FormValue("username"),
		Msg:      req.FormValue("msg"),
	}

	writeToFile(message)
	w.Write([]byte(http.StatusText(200)))
}

func query_messages(w http.ResponseWriter, req *http.Request) {
	// most_recent_from_user := req.URL.Query().Get("date")
	room := req.URL.Query().Get("room")
	retrieved_history, _ := getHistoryFromFile(room, "")
	switch v := retrieved_history.(type) {
	case Message:
		history := stringifyAsJson(v)
		fmt.Print("history: ", history)
		w.Write([]byte(history))
	default:
		http.Error(w, "Can't parse bro", http.StatusNoContent)
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
