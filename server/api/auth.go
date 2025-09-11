package api

import (
	"fmt"
	"net/http"
	"server/db"
	"time"
)

func Auth(w http.ResponseWriter, req *http.Request) {

	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	username := req.FormValue("username")
	password := req.FormValue("password")
	identityPubkey := req.FormValue("identity_pubkey")

	if username == "" {
		http.Error(w, "Username is required", http.StatusBadRequest)
		return
	}

	if password == "" {
		http.Error(w, "Password is required", http.StatusBadRequest)
		return
	}

	if identityPubkey == "" {
		http.Error(w, "Identity Pubkey is required", http.StatusBadRequest)
		return
	}

	user, err := db.GetUser(username)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] auth: Can't get user:", username, "- error:", err)
		http.Error(w, "Can't get user", http.StatusInternalServerError)
		return
	}

	if user.Username == "" {
		err = db.CreateUser(username, password, identityPubkey)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] auth: Can't create user:", username, "- error:", err)
			http.Error(w, "Can't create user", http.StatusInternalServerError)
			return
		}

		w.Write([]byte(http.StatusText(http.StatusCreated)))
		return
	} else if user.IdentityPubkey != identityPubkey && (user.Username != "" && password == user.Password) {
		err := db.EditUser(username, password, identityPubkey)
		if err != nil {
			fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] auth: Can't update identity key for user:", username, "-error:", err)
			http.Error(w, "Can't update identity key", http.StatusInternalServerError)
			return
		}
		fmt.Println("[LOG]: auth: Updated identity key for user:", username, "to: ", identityPubkey)
	} else {
		if user.Password != password {
			http.Error(w, "Wrong password", http.StatusUnauthorized)
			return
		}
		w.Write([]byte(http.StatusText(http.StatusOK)))
		return
	}
}
