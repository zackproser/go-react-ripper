package ripper

import (
	"fmt"
	"io"
	"net/http"
  "net/url"
  "path"
  "golang.org/x/net/html"
)

var client = &http.Client{}

// Take a target URL, fetch it and hand off its body for processing
func Rip(target *url.URL, chLinks chan<-string, chHosts chan<-string, chDone chan<-bool) {
  fmt.Println("Rip")

	resp, fetchErr := client.Get(target.String())

	if fetchErr != nil {
		fmt.Printf("Error fetching URL: %s : %v", target, fetchErr)
    chDone <- true
    return
	}

  parse(target, resp.Body, chLinks, chHosts, chDone)
}

// Parse all links found in the response body
func parse(target *url.URL, b io.ReadCloser, chLinks chan<-string, chHosts chan<-string, chDone chan<-bool) {
  fmt.Printf("parse")
  //When processing is complete, send on the done channel
  defer func() {
    chDone <- true
  }()

  // Tokenize the response body
  // Loop through it looking for
  // well-formed <a> tags and send their
  // href attribute values on the chLinks channel
  z := html.NewTokenizer(b)

  defer b.Close()

  for {
    tt := z.Next()

    switch{
      //If there's an error parsing the html, bail out of processing this token
      case tt == html.ErrorToken:
        return
      case tt == html.StartTagToken:
        t := z.Token()
        isAnchor := t.Data == "a"
        if isAnchor {
          for _, a := range t.Attr {
            if a.Key == "href" && a.Val != "/" && a.Val != "#" {
              u, parseErr := url.ParseRequestURI(a.Val)
              if parseErr == nil {
                hostname := u.Hostname()
                //Send just the hostname of the link into the hostnames channel
                chHosts <- hostname
                if (!u.IsAbs()) {
                  // Attempt to rewrite all relative links found to their full URL form
                  a.Val = path.Join(target.String(), a.Val)
                }
              }
              //Send the full value of the link into the links channel
              chLinks <- a.Val
              break
            }
          }
        }
    }
  }
}
