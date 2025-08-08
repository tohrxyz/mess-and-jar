package lib

import (
	"encoding/json"
	"fmt"
	"os"
)

const DB_DIR = "./db"
const ROOMS_DIR = "rooms"

func Check(e error) error {
	if e != nil {
		return e
	}
	return nil
}

func FilepathFromRoom(room string) string {
	return DB_DIR + "/rooms/" + room + ".json"
}

func FilepathFromUser(username string) string {
	return DB_DIR + "/users/" + username + ".json"
}

func createDirIfNotExists(dir string) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return os.MkdirAll(dir, 0755)
	}
	return nil
}

func createFileIfNotExists(filepath string, dir string) error {
	err := createDirIfNotExists(dir)
	if err != nil {
		return err
	}

	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		_, err := os.Create(filepath)
		if err != nil {
			return Check(err)
		}
	}
	return nil
}

func CreateDirOrFileIfNotExists(dir string, filepath string) error {
	err := createFileIfNotExists(filepath, dir)
	return err
}

func WriteStringifiedJsonToFileAppend(val string, room string) error {
	filepath := FilepathFromRoom(room)
	valBytes := []byte(val + "\n")

	err := createFileIfNotExists(filepath, DB_DIR+"/rooms")
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

// WriteData represents data that can be written to a file
type WriteData interface {
	~string | ~[]byte
}

func WriteToFile[T WriteData](val T, dir string, filepath string, isAppend bool) error {
	var valBytes []byte

	// Convert to any to enable type assertion
	anyVal := any(val)

	if str, ok := anyVal.(string); ok {
		valBytes = []byte(str + "\n")
	} else if bytes, ok := anyVal.([]byte); ok {
		valBytes = bytes
	} else {
		return fmt.Errorf("unsupported type: %T", val)
	}

	err := CreateDirOrFileIfNotExists(dir, filepath)
	if err == nil {
		var openMode int
		if isAppend {
			openMode = os.O_APPEND
		} else {
			openMode = os.O_WRONLY
		}
		f, err := os.OpenFile(filepath, openMode, 0644)
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
		return err
	}
}

func ReadFile(filepath string) ([]byte, error) {
	if !checkIfFileExists(filepath) {
		return nil, fmt.Errorf("%s does not exist, cannot read", filepath)
	}
	f, err := os.Open(filepath)
	if err != nil {
		return nil, Check(err)
	}
	defer f.Close()

	data, err := os.ReadFile(filepath)
	if err != nil {
		return nil, err
	}
	return data, nil
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

func ReadUserFromFile(username string) (string, error) {
	filepath := FilepathFromUser(username)

	err := createDirIfNotExists(DB_DIR + "/users")
	if err != nil {
		return "", err
	}

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

func GetUser(username string) (User, error) {
	filepath := FilepathFromUser(username)

	if !checkIfFileExists(filepath) {
		return User{}, nil
	}

	dat, err := os.ReadFile(filepath)
	if err != nil {
		return User{}, Check(err)
	}

	user := User{}
	err = json.Unmarshal(dat, &user)
	if err != nil {
		return User{}, Check(err)
	}

	return user, nil
}

func CreateUser(username string, password string) error {
	filepath := FilepathFromUser(username)

	err := createDirIfNotExists(DB_DIR + "/users")
	if err != nil {
		return err
	}

	user := User{
		Username: username,
		Password: password,
	}

	userJson, err := json.Marshal(user)
	if err != nil {
		fmt.Println("Error marshalling user: ", err)
		return Check(err)
	}

	err = os.WriteFile(filepath, userJson, 0644)
	if err != nil {
		fmt.Println("Error writing user to file: ", err)
		return Check(err)
	}

	return nil
}
