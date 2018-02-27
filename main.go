package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
	"os"
	"strconv"

	"go-react-ripper/ripper"
)

var genericErrorMessage string = "Please submit a valid, absolute URL such as https://example.com"

// Represents a processing request from the client
type ripRequest struct {
	Target    string `json:"target"`
	ParsedURL *url.URL
}

// Represents a json error response
type ripErrorResponse struct {
	Message string `json:"message"`
}

// A scraped links response from the backend
type ripResponse struct {
	Links []string       `json:"links"`
	Hosts map[string]int `json:"hostnames"`
}

type countResponse struct {
	Count int `json:"count"`
}

type ripRequestHandler struct{}

type uiRequestHandler struct{}

type countRequestHandler struct{}

// Generic HTTP error handler
// Accepts an string error message
// If no message is provided, uses a sensible default
func WriteErrorResponse(w http.ResponseWriter, msg string) {
	var message string
	if msg == "" {
		message = genericErrorMessage
	} else {
		message = msg
	}
	er := ripErrorResponse{Message: message}
	w.WriteHeader(http.StatusBadRequest)
	j, mErr := json.Marshal(&er)
	if mErr != nil {
		fmt.Printf("Error marshaling json error response: %v", mErr)
		w.Write([]byte("Please pass a valid, absolute URL such as https://example.com"))
	}
	w.Write(j)
	return
}

// Read the ripCount flat file and extract the count
func getRipCount() (int, bool) {
	contents, err := ioutil.ReadFile("ripCount")
	if err != nil {
		fmt.Printf("Error reading ripCount file: %v")
		return 0, false
	}
	count, convertErr := strconv.Atoi(string(contents))
	if convertErr != nil {
		fmt.Printf("Error converting ripCount file contents to int: %v", convertErr)
		return 0, false
	}
	return count, true
}

// Increment the count stored in ripCount by 1
func incrementRipCount() {

	count, success := getRipCount()
	if success != true {
		return
	}

	f, openErr := os.Create("ripCount")

	if openErr != nil {
		fmt.Printf("Error opening ripCount file for overwriting: %v", openErr)
	}

	_, writeErr := f.WriteString(fmt.Sprintf("%d", count+1))

	if writeErr != nil {
		fmt.Printf("Error writing to ripCount file: %v", writeErr)
	} else {
		fmt.Printf("Successfully incremented ripCount contents to: %v", count+1)
	}
}

// Handler for count requests from the frontend app
func (ch countRequestHandler) ServeHTTP(w http.ResponseWriter, req *http.Request) {

	count, success := getRipCount()
	if success != true {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("Could not get ripCount"))
		return
	}

	c := countResponse{Count: count}

	j, mErr := json.Marshal(&c)
	if mErr != nil {
		fmt.Printf("Error marshalling rip count json: %v", mErr)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("ripCount could not be formatted"))
		return
	}

	w.Write(j)
	return
}

// Main HTTP handler
// Attempt to parse a "target" field from
// the incoming request and begin processing it if it appears valid
func (rh ripRequestHandler) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	defer req.Body.Close()

	body, readErr := ioutil.ReadAll(req.Body)

	if readErr != nil {
		fmt.Printf("Error reading API request body: %v", readErr)
	}

	// Only process valid looking requests
	if len(body) > 0 {
		t := ripRequest{}
		unmarshalErr := json.Unmarshal(body, &t)
		if unmarshalErr != nil {
			fmt.Printf("Bad rip request: %v", unmarshalErr)
			WriteErrorResponse(w, unmarshalErr.Error())
			return
		}

		// Ensure target URL looks valid enough to make a request against
		parsedUrl, parseErr := url.ParseRequestURI(t.Target)

		if parseErr != nil {
			fmt.Printf("Invalid URL requested: %v", parseErr)
			er := ripErrorResponse{Message: genericErrorMessage}
			errorResponse, marshalErr := json.Marshal(&er)
			if marshalErr != nil {
				fmt.Printf("Error marshaling error response json: %v", marshalErr)
				WriteErrorResponse(w, unmarshalErr.Error())
				return
			}
			w.WriteHeader(http.StatusBadRequest)
			w.Write(errorResponse)
			return
		}

		// Only accept fully qualified URLs
		if !parsedUrl.IsAbs() {
			fmt.Printf("Rejecting relative URL request: %v", t.Target)
			WriteErrorResponse(w, "Relative URLs such as /example.html are not supported. Please supply a full URL such as https://www.example.com/something")
			return
		}

		t.ParsedURL = parsedUrl

		// Create channels for each request
		// chUrls handles links that are found
		// chHosts handles link hostnames
		// chRipFinished serves to indicate when a processing job is finished
		chLinks := make(chan string)
		chHosts := make(chan string)
		chRipFinished := make(chan bool)

		defer close(chLinks)
		defer close(chHosts)
		defer close(chRipFinished)

		go ripper.Rip(parsedUrl, chLinks, chHosts, chRipFinished)

		foundLinks := []string{}
		foundHosts := []string{}

		// Listen on channels for links and done status
		for {
			select {
			case link := <-chLinks:
				foundLinks = append(foundLinks, link)
			case host := <-chHosts:
				foundHosts = append(foundHosts, host)
			case <-chRipFinished:
				fmt.Printf("Rip finished\n")
				go incrementRipCount()
				// Once processing is complete, we can send back the
				// extracted links in a json response
				r := ripResponse{
					Links: foundLinks,
					Hosts: tallyCounts(foundHosts),
				}
				j, marshalErr := json.Marshal(&r)

				if marshalErr != nil {
					fmt.Printf("Error marshaling json response: %v", marshalErr)
				}

				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusOK)
				w.Write(j)
				return
			}
		}
	} else {
		// We didn't receive a valid request body
		fmt.Printf("Bad request with empty body received\n")
		WriteErrorResponse(w, "")
		return
	}
}

//Takes a slice of hostname strings and returns
//a map denoting how many times each hostname occurs
func tallyCounts(s []string) map[string]int {
	//Map for holding counts of each item
	m := make(map[string]int)
	for _, v := range s {
		if _, present := m[v]; present {
			m[v] += 1
		} else {
			m[v] = 1
		}
	}
	return m
}

// Determine port
// Bind to port and start server
func main() {

	mux := http.NewServeMux()

	rh := ripRequestHandler{}
	ch := countRequestHandler{}

	// API endpoint for processing
	mux.Handle("/api/v1/rip", rh)

	// API endpoint for rip counts
	mux.Handle("/api/v1/count", ch)

	// Serve static UI files (react)
	mux.Handle("/", http.FileServer(http.Dir("./ui/build")))

	// Attempt to read the port ENV argument
	// Otherwise use port 3000 as a default
	setPort := os.Getenv("PORT")
	if setPort == "" {
		setPort = "3000"
	}

	port := ":" + setPort

	fmt.Printf("Ripper listening on %s", port)
	log.Fatal(http.ListenAndServe(port, mux))
}
