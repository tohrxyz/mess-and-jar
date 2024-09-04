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

func createFileIfNotExists(filepath string) error {
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		_, err := os.Create(filepath)
		if err != nil {
			return Check(err)
		}
	}
	return nil
}

func WriteStringifiedJsonToFileAppend(val string, room string) error {
	filepath := FilepathFromRoom(room)
	valBytes := []byte(val + "\n")

	err := createFileIfNotExists(filepath)
	if err == nil {
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
	} else {
		fmt.Println("Error creating file: ", err)
		return err
	}
}

func checkIfFileExists(filepath string) bool {
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		return false
	}
	return true
}

func ReadHistoryFromFile(room string) (string, error) {
	filepath := FilepathFromRoom(room)

	if !checkIfFileExists(filepath) {
		return "", nil
	}

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
