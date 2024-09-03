package lib

import (
	"encoding/json"
	"fmt"
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
