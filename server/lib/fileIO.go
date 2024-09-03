package lib

import "os"

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
