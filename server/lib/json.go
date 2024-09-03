package lib

import (
	"encoding/json"
	"fmt"
	"strings"
)

func MessageToJson(val Message) (string, error) {
	jsonBytes, err := json.Marshal(val)

	if err != nil {
		fmt.Println("Error with stringifying message to json: ", err)
		return "", err
	}

	jsonString := string(jsonBytes)
	return jsonString, nil
}

func StringJsonToMessage(val string) (Message, error) {
	bytes := []byte(val)

	var message Message
	err := json.Unmarshal(bytes, &message)

	if err != nil {
		panic(err)
	}

	return message, nil
}

func GetChatHistoryAfterTimestamp(data string, timestamp int64) (string, error) {
	splitted := strings.Split(data, "\n")
	var filteredHistory []string

	for _, line := range splitted {
		if line == "" {
			continue
		}

		message, err := StringJsonToMessage(line)
		if err != nil {
			return "", Check(err)
		}

		if message.Date > timestamp {
			filteredHistory = append(filteredHistory, line)
		}
	}

	return strings.Join(filteredHistory, ","), nil
}

func HistoryToJson(history string) string {
	return "[" + history + "]"
}
