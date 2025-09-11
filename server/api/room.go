package api

import (
	"fmt"
	"net/http"
	"server/db"
	"server/lib"
	"time"
)

const (
	RoomCreate = "create"
	RoomEdit   = "edit"
	RoomGet    = "get"
)

func RoomEndpoint(w http.ResponseWriter, req *http.Request) {
	method := req.FormValue("method")
	if method == "" {
		http.Error(w, "Must specify room method (create/edit/get)", http.StatusBadRequest)
		return
	}

	roomData := lib.Room{
		Id:       req.FormValue("id"),
		Name:     req.FormValue("name"),
		Password: req.FormValue("password"),
	}

	switch method {
	case RoomCreate:
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Creating room: ", roomData.Id)
		if roomData.Id == "" || roomData.Name == "" || roomData.Password == "" {
			http.Error(w, "Must specify room id, name and password", http.StatusBadRequest)
			return
		}
		err := db.CreateRoom(roomData.Id, roomData.Name, roomData.Password)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot create room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot create room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Write([]byte(http.StatusText(http.StatusCreated)))
		return
	case RoomEdit:
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Editing room: ", roomData.Id)
		if roomData.Id == "" || roomData.Name == "" || roomData.Password == "" {
			http.Error(w, "Must specify room id, name and password", http.StatusBadRequest)
			return
		}

		requestedRoom, err := db.GetRoom(roomData.Id)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot get room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot get room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		if requestedRoom.Password != roomData.Password {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Unauthorized to edit room:", roomData.Id)
			http.Error(w, "Unauthorized: incorrect room password", http.StatusUnauthorized)
			return
		}

		err = db.UpdateRoom(roomData.Name, roomData.Id)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot edit room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot edit room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Write([]byte(http.StatusText(http.StatusOK)))
		return
	case RoomGet:
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Querying room: ", roomData.Id)
		if roomData.Id == "" {
			http.Error(w, "Must specify room id", http.StatusBadRequest)
			return
		}

		roomDataLoaded, err := db.GetRoom(roomData.Id)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot get room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot get room: "+err.Error(), http.StatusInternalServerError)
			return
		}

		serializedRoom, err := lib.ToJson(roomDataLoaded)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] roomEndpoint: Cannot serialize room data for room:", roomData.Id, "- error:", err)
			http.Error(w, "Cannot serialize room data: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Write([]byte(serializedRoom))
		return
	default:
		http.Error(w, "Unsupported room method", http.StatusBadRequest)
	}
}
