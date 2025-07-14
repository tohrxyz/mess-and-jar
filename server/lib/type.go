package lib

type Message struct {
	Date     int64  `json:"date"`
	Room     string `json:"room"`
	Username string `json:"username"`
	Msg      string `json:"msg"`
}

type User struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Room struct {
	Id       string `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
}
