package lib

import (
	"fmt"
	"os"
)

func Check(e error) error {
	if e != nil {
		return e
	}
	return nil
}

func FilepathFromRoom(room string) string {
	return "./db/" + room + ".json"
}

func WriteStringifiedJsonToFileAppend(val string, room string) error {
	filepath := FilepathFromRoom(room)
	valBytes := []byte(val + "\n")

	f, err := os.OpenFile(filepath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return Check(err)
	}

	defer f.Close()

	_, err = f.Write(valBytes)
	if err != nil {
		return Check(err)
	}

	return nil
}

func ReadHistoryFromFile(room string) (string, error) {
	filepath := FilepathFromRoom(room)

	f, err := os.Open(filepath)
	if err != nil {
		fmt.Println("Error opening file: ", err)
		return "", Check(err)
	}

	defer f.Close()

	dat, err := os.ReadFile(filepath)
	Check(err)
	return string(dat), nil
}
