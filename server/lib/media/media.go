package media

import "server/lib"

const MEDIA_DIR = "media"
const MEDIA_PATH = "./db/media/"

func FilepathFromMediaId(id string) string {
	return MEDIA_PATH + id
}

func SaveMediaToFile(binaryData []byte, fileId string) error {
	filepath := FilepathFromMediaId(fileId)
	err := lib.CreateDirOrFileIfNotExists(MEDIA_PATH, filepath)
	if err != nil {
		return err
	}

	err = lib.WriteToFile(binaryData, MEDIA_DIR, filepath, false)
	return err
}

func GetMediaFromFile(fileId string) ([]byte, error) {
	filepath := FilepathFromMediaId(fileId)
	data, err := lib.ReadFile(filepath)
	if err != nil {
		return nil, err
	}

	return data, nil
}
