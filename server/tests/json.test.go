package main

import (
	"fmt"
	"server/lib"
)

func main() {
	// in := `{"date":129412939,"room":"general","username":"alice","msg":"hey"}`

	// message := lib.Message{
	// 	Date:     129412939,
	// 	Room:     "general",
	// 	Username: "alice",
	// 	Msg:      "hey",
	// }

	// json, err := lib.MessageToJson((message))

	// if err != nil {
	// 	panic(err)
	// }

	// fmt.Println(in)
	// fmt.Println(json)

	// parsedMsg, err := lib.StringJsonToMessage(in)

	// if err != nil {
	// 	panic(err)
	// }

	// fmt.Printf("%+v\n", message)
	// fmt.Printf("%+v\n", parsedMsg)

	// err := lib.WriteStringifiedJsonToFileAppend(in, "general")

	// lib.Check(err)

	history, err := lib.ReadHistoryFromFile("general")

	if err != nil {
		lib.Check(err)
	}

	filteredHistory, err := lib.GetChatHistoryAfterTimestamp(history, int64(3000))
	if err != nil {
		lib.Check(err)
	}
	fmt.Println(history)
	fmt.Println(filteredHistory)

	filteredHistoryToJson := lib.HistoryToJson(filteredHistory)

	fmt.Println(filteredHistoryToJson)
}
