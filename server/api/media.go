package api

import (
	"fmt"
	"io"
	"net/http"
	"server/lib/media"
	"time"
)

func UploadMedia(w http.ResponseWriter, req *http.Request) {
	fileID := req.URL.Query().Get("file_id")
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Uploading media with ID:", fileID)

	if req.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	data, err := io.ReadAll(req.Body)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] uploadMedia: Cannot read request body for file ID:", fileID, "- error:", err)
		http.Error(w, "Cannot read request body: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer req.Body.Close()

	if fileID == "" {
		http.Error(w, "file_id parameter is required", http.StatusBadRequest)
		return
	}

	err = media.SaveMediaToFile(data, fileID)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] uploadMedia: Cannot save the file for ID:", fileID, "- error:", err)
		http.Error(w, "Cannot save the file", http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte("Media uploaded successfully"))
}

func DownloadMedia(w http.ResponseWriter, req *http.Request) {
	fileID := req.URL.Query().Get("file_id")
	fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[API] Downloading media with ID:", fileID)

	if req.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if fileID == "" {
		http.Error(w, "file_id parameter is required", http.StatusBadRequest)
		return
	}

	binaryData, err := media.GetMediaFromFile(fileID)
	if err != nil {
		fmt.Println(time.Now().Format("2006-01-02 15:04:05"), "[ERROR] downloadMedia: Cannot read the file for ID:", fileID, "- error:", err)
		http.Error(w, "Cannot read the file: "+err.Error(), http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(binaryData)))

	w.WriteHeader(http.StatusOK)
	w.Write(binaryData)
}
