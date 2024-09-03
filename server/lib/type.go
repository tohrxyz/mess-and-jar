package lib

type Message struct {
	Date     int64  `json:"date"`
	Room     string `json:"room"`
	Username string `json:"username"`
	Msg      string `json:"msg"`
}
