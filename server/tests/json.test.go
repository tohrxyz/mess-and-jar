package main

import (
	"fmt"
	"server/lib"
)

func main() {
	in := `{"date":129412939,"room":"general","username":"alice","msg":"hey"}`

	message := lib.Message{
		Date:     129412939,
		Room:     "general",
		Username: "alice",
		Msg:      "hey",
	}

	json, err := lib.MessageToJson((message))

	if err != nil {
		panic(err)
	}

	fmt.Println(in)
	fmt.Println(json)
}
