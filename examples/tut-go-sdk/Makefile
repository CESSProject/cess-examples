test:
	go test -v ./...

fmt:
	go fmt ./...

vet:
	go vet ./...

check: vet fmt test

clean:
	# rm everything except pdf files in assets
	find ./assets/* -type f ! -name '*.pdf' -delete
