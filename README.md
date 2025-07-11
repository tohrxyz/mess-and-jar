# Mess-and-jar
Web-based messenger app, with Next frontend and Golang server. Playing around with architecture, encryption and things like that.

### How to run

[fe]
1. ```cd next-app``` >>> ```bun install```
2. add NEXT_PUBLIC_API_BACKEND_URL to `.env` with value `http://localhost:8090` or your local ip if you want to run this from other device
3. ```bun run dev```

[be]
1. ```cd server```
2. ```go run main.go```

compartmentalized json files in `/db/{users,rooms}` serve as db for now
