package lib

import "strconv"

func ParseDate(date_str string) int64 {
	num, err := strconv.ParseInt(date_str, 10, 64)
	if err != nil {
		return 0
	}
	return num
}
