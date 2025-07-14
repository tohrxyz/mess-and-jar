package room

import (
	"encoding/json"
	"fmt"
	"os"
	"server/lib"
)

const ROOM_PATH = "./db/room"
const ROOM_DIR = "room"

func RoomFilepathFromId(id string) string {
	return ROOM_PATH + "/" + id + ".json"
}

func CheckRoomExistAlready(id string) (bool, error) {
	filepath := RoomFilepathFromId(id)
	if _, err := os.Stat(filepath); os.IsNotExist(err) {
		return false, nil
	} else if err != nil {
		return false, err
	}
	return true, nil
}

func CreateRoom(room lib.Room) error {
	existsAlready, err := CheckRoomExistAlready(room.Id)
	if err != nil {
		return err
	}

	if existsAlready {
		return fmt.Errorf("room with id %s already exists", room.Id)
	}

	filepath := RoomFilepathFromId(room.Id)
	err = lib.CreateDirOrFileIfNotExists(lib.DB_DIR+"/"+ROOM_DIR, filepath)
	if err != nil {
		return err
	}

	serializedData, err := SerializeRoom(room)
	if err != nil {
		return err
	}

	err = lib.WriteToFile(serializedData, ROOM_DIR, filepath, false)

	return err
}

func EditRoom(room lib.Room) error {
	err := CreateRoom(room)
	return err
}

func GetRoom(id string) (lib.Room, error) {
	exists, err := CheckRoomExistAlready(id)
	if err != nil {
		return lib.Room{}, err
	}
	if !exists {
		return lib.Room{}, fmt.Errorf("room with id %s does not exist", id)
	}
	filepath := RoomFilepathFromId(id)
	data, err := lib.ReadFile(filepath)
	if err != nil {
		return lib.Room{}, err
	}

	deserializedRoom, err := DeserializeRoom(string(data))
	if err != nil {
		return lib.Room{}, err
	}
	return deserializedRoom, nil
}

func SerializeRoom(room lib.Room) (string, error) {
	serialized, err := json.Marshal(room)
	if err != nil {
		return "", err
	}
	return string(serialized), nil
}

func DeserializeRoom(room string) (lib.Room, error) {
	var roomObj = lib.Room{}
	err := json.Unmarshal([]byte(room), &roomObj)
	if err != nil {
		return lib.Room{}, err
	}
	return roomObj, nil
}
