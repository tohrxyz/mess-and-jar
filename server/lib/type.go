package lib

type Message struct {
	Date           int64  `json:"date"`
	Room           string `json:"room"`
	Username       string `json:"username"`
	Msg            string `json:"msg"`
	IdentityPubkey string `json:"identity_pubkey"`
	Signature      string `json:"signature"`
}

type User struct {
	Username       string `json:"username"`
	Password       string `json:"password"`
	IdentityPubkey string `json:"identity_pubkey"`
}

type Room struct {
	Id       string `json:"id"`
	Name     string `json:"name"`
	Password string `json:"password"`
}
